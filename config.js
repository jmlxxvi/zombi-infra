const config = {
    aws: {
        region: process.env.AWS_REGION || "us-east-2.",
        image_id: process.env.AWS_IMAGE_ID || "ami-0f2b4fc905b0bd1f1",
        key_pair: process.env.AWS_KEY_PAIR_NAME || "MyKey",
        security_groups: [
            process.env.AWS_SECURITY_GROUP || "sg-0e9b1d25dxxxxxxx"
        ],
        subnet_id: process.env.AWS_SUBNET_ID || "subnet-e1cxxxxx",
        instance_name: process.env.AWS_INSTANCE_NAME || "Zombi Server Development.",
        instance_type: process.env.AWS_INSTANCE_TYPE || "t2.micro.",
        lambda: {
            bucket_name: "zombibucketdev"
        },
        api_versions: {
            ec2: '2016-11-15',
            s3: '2006-03-01',
            iam: '2010-05-08',
            lanbda: '2015-03-31'
        },
        use_console: false,
        ssh: {
            username: process.env.AWS_SSH_USERNAME || "centos.",
            key_file: process.env.AWS_SSH_KEY_FILE || `${__dirname}/key.pem`
        }
    }
};

module.exports = config;

// Instance images IDs
// Amazon Linux 2 AMI (HVM), SSD Volume Type - ami-02ccb28830b645a41 (64-bit x86) username: "ec2-user"
// Amazon Linux AMI 2018.03.0 (HVM), SSD Volume Type - ami-0d542ef84ec55d71c username: "ec2-user"
// CentOS 7 (x86_64) - with Updates HVM - ami-0f2b4fc905b0bd1f1 username: "centos"
