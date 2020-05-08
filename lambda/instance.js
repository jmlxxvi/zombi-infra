"use strict";

const config = require("../config");
const ssh = require("../ssh");

const AWS = require("aws-sdk");
const fs = require('fs');
const { zip } = require('zip-a-folder');
const shell = require('shelljs');

const sleep = ms => { return new Promise(resolve => setTimeout(resolve, ms)); };

const instance_check_state = async instance_id => {

    const instance_data = await new AWS.EC2().describeInstances({ InstanceIds: [instance_id] }).promise();

    const instance_state = instance_data.Reservations[0].Instances[0].State.Name;

    if (instance_state !== "running") {

        console.log(`Instance is in state ${instance_state}, waiting...`);

        await sleep(5000);

        await instance_check_state(instance_id);

    } else { console.log(`Instance is in state ${instance_state}, server creation done.`); }

    return instance_data.Reservations[0].Instances[0].PublicDnsName;

};

const instance_check_network = async (instance_public_dns_name, attempts = 0) => {

    if (attempts >= 10) {
        console.log(`Cannot connect after ${attempts} attempts, quitting.`);
        return false;
    }

    const resp = await ssh.ping({
        host: instance_public_dns_name,
        username: config.aws.ssh.username,
        privateKey: config.aws.ssh.key_file
    });

    if (!resp) {

        console.log(`Instance network still down, waiting...`);

        await sleep(10000);

        await instance_check_network(instance_public_dns_name, attempts + 1);

    } else { console.log(`Instance network running, SSH can connect now.`); }

    return true;

};

(async () => {

    try {

        if (!fs.existsSync(config.aws.ssh.key_file)) {
            console.log(`SSH key file "${config.aws.ssh.key_file}" not found, please check configuration.`);

            return false;
        }

        if (config.aws.use_console) { AWS.config.logger = console; }

        AWS.config.update({ region: config.aws.region });

        AWS.config.apiVersions = config.aws.api_versions;

        console.log("Access key:", AWS.config.credentials.accessKeyId);
        console.log("Region:", AWS.config.region);

        const s3 = new AWS.S3();

        console.log(config.aws.lambda.bucket_name);

        var bucketParams = {
            Bucket: config.aws.lambda.bucket_name,
            ACL: 'public-read'
        };

        try {

            const s3_data = await s3.createBucket(bucketParams).promise();

            console.log("Bucket URL: ", s3_data.Location);

        } catch (error) {

            if (error.code = 'BucketAlreadyOwnedByYou') {

                console.log("Bucket was already created");

            } else { throw error; }
        }

        const code_dir = `${__dirname}/../../../server`;
        const pack_files = `${__dirname}/../../../package*.json`;

        shell.cp('-r', code_dir, `${__dirname}/../.temp/code/`);
        shell.cp(pack_files, `${__dirname}/../.temp/code/server`);

        shell.pushd(`${__dirname}/../.temp/code/server`);

        shell.exec('npm i');

        const zip_file_name = "server.zip";
        const zip_file_path = `${__dirname}/../.temp/zip/${zip_file_name}`;

        await zip(`${__dirname}/../.temp/code/server`, zip_file_path);

        // Read content from the file
        const fileContent = fs.readFileSync(zip_file_path);

        // Setting up S3 upload parameters
        const params = {
            Bucket: config.aws.lambda.bucket_name,
            Key: zip_file_name,
            Body: fileContent
        };

        // Uploading files to the bucket
        const upload_data = await s3.upload(params).promise();

        console.log(`File uploaded successfully to ${upload_data.Location}`);

        console.log(JSON.stringify(upload_data));
        // {"ETag":"\"b62f5f98dc76b247cca4583d9c936726\"","Location":"https://zombibucketdev.s3.us-east-2.amazonaws.com/key.pem","key":"key.pem","Key":"key.pem","Bucket":"zombibucketdev"}


        const iam = new AWS.IAM();

        const myPolicy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {
                        "Service": "lambda.amazonaws.com"
                    },
                    "Action": "sts:AssumeRole"
                }
            ]
        };

        //$ aws iam attach-role-policy --role-name lambda-ex --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

        let role_arn;

        try {

            // const role_delete_data = await iam.deleteRole({RoleName: "ROLE"}).promise();

            // console.log(JSON.stringify(role_delete_data));

            const createParams = {
                AssumeRolePolicyDocument: JSON.stringify(myPolicy),
                RoleName: "ROLE"
            };
            
            const role_data = await iam.createRole(createParams).promise();

            role_arn = role_data.Role.Arn;

            console.log("Role ARN:", role_arn);

            fs.writeFileSync(`${__dirname}/role.arn`, role_arn);

        } catch (error) {

            if (error.code = 'Role with name ROLE already exists.') {

                console.log("Role was already created");

                role_arn = fs.readFileSync(`${__dirname}/role.arn`).toString();

            } else { throw error; }

        }

        var policyParams = {
            PolicyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
            RoleName: "ROLE"
        };

        const policy_data = await iam.attachRolePolicy(policyParams).promise();

        console.log(JSON.stringify(policy_data));

        console.log("AWSLambdaBasicExecutionRole Policy attached");

        // AWSLambdaVPCAccessExecutionRole

        const lambda = new AWS.Lambda();

        console.log(JSON.stringify(await lambda.deleteFunction({ FunctionName: "server" }).promise()));
        
        const lambda_params = {
            Code: {
                S3Bucket: config.aws.lambda.bucket_name,
                S3Key: zip_file_name
            },
            FunctionName: 'server', /* required */
            Handler: 'endpoints.server', /* required */
            Role: role_arn, /* required */
            Runtime: 'nodejs12.x', /* required */
            Description: 'Zombi Server Lambda'
        };

        await lambda.createFunction(lambda_params).promise();
        
        console.log("Lambda created successfully"); 

        // // Create the IAM service object
        // const iam = new AWS.IAM();

        // const myPolicy = {
        //     "Version": "2012-10-17",
        //     "Statement": [
        //         {
        //             "Effect": "Allow",
        //             "Principal": {
        //                 "Service": "lambda.amazonaws.com"
        //             },
        //             "Action": "sts:AssumeRole"
        //         }
        //     ]
        // };

        // const createParams = {
        //     AssumeRolePolicyDocument: JSON.stringify(myPolicy),
        //     RoleName: "ROLE"
        // };

        // var policyParams = {
        //     PolicyArn: "arn:aws:iam::policy/service-role/AWSLambdaRole",
        //     RoleName: "ROLE"
        // };

        // const role_data = await iam.createRole(createParams).promise();

        // console.log("Role ARN:", role_data.Role.Arn);

        // const policy_data = await iam.attachRolePolicy(policyParams).promise();

        // console.log(JSON.stringify(policy_data));

        // console.log("AWSLambdaRole Policy attached");





        console.log("Instance creation done");

    } catch (error) { console.log(error); }

})();











