# Serverless RSS for AWS
このプロジェクトはAWS上でRSSのサーバー部分とAPIを提供します。

デプロイはAWS CDKによって行われ、できる限りコンソールを直接触れないことを目標に設計されています。

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## for development

- 環境
    - node.js == v16.14.1
    - python == 3.7
    - AWS CDK == 2.28.1