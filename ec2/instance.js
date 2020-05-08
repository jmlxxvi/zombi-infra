"use strict";

const config = require("../config");
const ssh = require("../ssh");

const AWS = require("aws-sdk");
const fs = require('fs');

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

        if(config.aws.use_console) { AWS.config.logger = console; }

        AWS.config.update({region: config.aws.region});

        AWS.config.apiVersions = config.aws.api_versions;

        console.log("Access key:", AWS.config.credentials.accessKeyId);
        console.log("Region:", AWS.config.region);

        var instance_settings = {
            ImageId: config.aws.image_id,
            InstanceType: config.aws.instance_type,
            KeyName: config.aws.key_pair,
            MaxCount: 1,
            MinCount: 1,
            SecurityGroupIds: config.aws.security_groups,
            SubnetId: config.aws.subnet_id,
            TagSpecifications: [
                {
                    ResourceType: "instance",
                    Tags: [
                        {
                            Key: "Name",
                            Value: config.aws.instance_name
                        }
                    ]
                }
            ]
        };

        // TODO check if exists with the same name before creating a new instance
        var instance_creation_data = await new AWS.EC2().runInstances(instance_settings).promise();

        var instance_id = instance_creation_data.Instances[0].InstanceId;

        console.log("Created instance: ", instance_id);

        const instance_public_dns_name = await instance_check_state(instance_id);

        console.log(`Ìnstance public DNS name: ${instance_public_dns_name}`);

        fs.writeFileSync(`${__dirname}/server.name`, instance_public_dns_name);

        if(!await instance_check_network(instance_public_dns_name)) {

            console.log("Instance network didn't work, please check configuration.");

        }

        console.log("Instance creation done");

    } catch (error) { console.log(error); }

})();







