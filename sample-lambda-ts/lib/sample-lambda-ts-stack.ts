import * as cdk from "aws-cdk-lib";
import { aws_lambda_nodejs as lambdaNode } from "aws-cdk-lib";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class SampleLambdaTsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new lambdaNode.NodejsFunction(this, "SampleFunc", {
      functionName: "sampleFunc",
      entry: "lambda/sampleFunc/index.ts",
      runtime: Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(3),
      bundling: {
        forceDockerBundling: false,
      },
    });
  }
}
