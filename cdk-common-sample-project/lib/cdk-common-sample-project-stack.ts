import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as child_process from 'child_process';

export class CdkCommonSampleProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new lambda.Function(this, 'FunctionOneLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'functionOne.app.lambda_handler', 
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions'),{
        bundling: {
          // ローカルデプロイ時。ローカルでバンドリングする。コンテナ立ち上げない分多少早い。
          local: {
            tryBundle(outputDir: string): boolean {
              return bundleLocally(
                [ 'functionOne', 'common' ],
                path.join(__dirname, '../functions'),
                outputDir
              ); 
            }
          },
          // CD用。Dockerイメージを使用してバンドリングする。Dockerイメージ使うので再現性が高い。
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          command: [getBundlingCommand(['functionOne', 'common'])],
        },
      }),
    });

    new lambda.Function(this, 'FunctionSecondLambda', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'functionSecond.app.lambda_handler', 
      code: lambda.Code.fromAsset(path.join(__dirname, '../functions'),{
        bundling: {
          local: {
            tryBundle(outputDir: string): boolean {
              return bundleLocally(
                [ 'functionSecond', 'common' ],
                path.join(__dirname, '../functions'),
                outputDir
              );
            }
          },
          image: lambda.Runtime.PYTHON_3_11.bundlingImage,
          command: [getBundlingCommand(['functionSecond', 'common'])],
        },
      }),
    });


    /**
     * 複数のディレクトリを出力先にコピーする関数
     *
     * @param dirs コピー対象のディレクトリ名の配列
     * @param inputPath Docker内の入力パス（通常は /asset-input）
     * @param outputDir Docker内の出力パス（通常は /asset-output）
     * @returns 成功した場合は true、失敗した場合は false
     */
    function bundleLocally(
      dirs: string[],
      inputPath: string,
      outputDir: string
    ): boolean {
      try {
        // 各ディレクトリをoutputDirにそのままコピーする
        dirs.forEach((dir) => {
          const dirSrc = path.join(inputPath, dir);
          // 直接コピーすると、outputDirに <dir> フォルダが作成される
          child_process.execSync(`cp -R "${dirSrc}" "${outputDir}/"`);
        });
        return true;
      } catch (err) {
        console.error('Local bundling に失敗しました:', err);
        return false;
      }
    }


    /**
     * 複数のディレクトリを出力先にコピーするシェルコマンドの文字列を生成する関数
     *
     * @param dirs コピー対象のディレクトリ名の配列
     * @param inputPath Docker内の入力パス（通常は /asset-input）
     * @param outputPath Docker内の出力パス（通常は /asset-output）
     * @returns コマンド文字列
     */
    function getBundlingCommand(
      dirs: string[],
      inputPath: string = '/asset-input',
      outputPath: string = '/asset-output'
    ): string {
      // 出力先ディレクトリ作成コマンド
      const commands = [`mkdir -p ${outputPath}`];

      // 各ディレクトリをコピーするコマンドを生成
      dirs.forEach((dir) => {
        commands.push(`cp -R ${inputPath}/${dir} ${outputPath}/`);
      });

      // コマンド同士は && で連結して、途中でエラーがあれば処理が停止するようにしている
      return commands.join(' && ');
    }
  }
}
