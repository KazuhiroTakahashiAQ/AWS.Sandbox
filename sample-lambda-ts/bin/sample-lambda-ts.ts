#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SampleLambdaTsStack } from '../lib/sample-lambda-ts-stack';

const app = new cdk.App();
new SampleLambdaTsStack(app, 'SampleLambdaTsStack');
