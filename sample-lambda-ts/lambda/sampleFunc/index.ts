import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import { v4 as uuidv4 } from "uuid";

interface S3ObjectSpec {
  s3Bucket: string;
  s3Key: string;
}

interface EventPayload {
  /** 可変長配列で渡す */
  objects: S3ObjectSpec[];
}

const TMP_BUCKET = process.env.TMP_BUCKET!;
const s3 = new S3Client({}); // リージョンは Lambda の実行環境に従う

function toNodeReadable(
  body: Readable | ReadableStream | Blob | undefined,
): Readable {
  if (!body) throw new Error("S3 Body is empty");

  // そのまま Node.js の Readable なら返す
  if (body instanceof Readable) return body;

  // Blob の場合は stream() が WHATWG ReadableStream を返す
  if (body instanceof Blob) {
    return Readable.fromWeb(body.stream());
  }

  // 残りは WHATWG ReadableStream とみなして変換
  return Readable.fromWeb(body as ReadableStream);
}

export const handler = async (event: EventPayload) => {
  if (!event.objects?.length) {
    throw new Error("objects is empty");
  }

  // 例: tmp/20250616-<uuid>.zip
  const zipKey = `tmp/${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${uuidv4()}.zip`;

  /** S3 へのストリーミングアップロードを先に開始しておく */
  const zipStream = new PassThrough();
  const uploader = new Upload({
    client: s3,
    params: {
      Bucket: TMP_BUCKET,
      Key: zipKey,
      Body: zipStream,
      ContentType: "application/zip",
    },
  });

  /** archiver は zip を生成して zipStream に pipe */
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    throw err;
  });
  archive.pipe(zipStream);

  /** 各オブジェクトを取得して ZIP へ追加（S3→Lambda→archiver→S3 の完全ストリーム） */
  for (const { s3Bucket, s3Key } of event.objects) {
    const { Body } = await s3.send(
      new GetObjectCommand({
        Bucket: s3Bucket,
        Key: s3Key,
      }),
    );


    // 相対パスを ZIP 内に再現したい場合 name にそのまま s3Key を使う
    const nodeStream = toNodeReadable(Body);
    archive.append(nodeStream, { name: s3Key });
  }

  await archive.finalize();     // アーカイブ完了を待つ
  await uploader.done();        // アップロード完了を待つ

  /** 署名付き URL (15 分) */
  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: TMP_BUCKET, Key: zipKey }),
    { expiresIn: 900 }, // 秒
  );

  return {
    zipBucket: TMP_BUCKET,
    zipKey,
    downloadUrl,
    expiresIn: 900,
  };
};
