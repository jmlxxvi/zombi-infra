"use strict";

const config = require("../config");
const ssh = require("../ssh");
const zombi_env = require("../zombi.env");

const fs = require('fs');

(async () => {

	try {

		const instance_public_dns_name = fs.readFileSync(`${__dirname}/server.name`).toString();

		const base_home = `/home/${config.aws.ssh.username}/zombi-server`;
		const base_run_file = `${base_home}/base.sh`;
		const base_loc_file = `${__dirname}/base.sh`;
		const base_env_file = `${base_home}/.env`;

		const zombi_env_file = zombi_env.create_env_file();

		await ssh.connect({
			host: instance_public_dns_name,
			username: config.aws.ssh.username,
			privateKey: config.aws.ssh.key_file
		});

		await ssh.command(`rm -rf ${base_home}`);
		await ssh.command(`mkdir -p ${base_home}`);

		await ssh.putfile(zombi_env_file, base_env_file);
		await ssh.putfile(base_loc_file, `${base_run_file}-noenv`);
		await ssh.putfile(`${__dirname}/nginx.conf`, `${base_home}/nginx.conf`);

		await ssh.command(`source .env; envsubst < "${base_run_file}-noenv" > "${base_run_file}";`, [], base_home);
		await ssh.command(`rm -f ${base_run_file}-noenv`);
		await ssh.command(`sudo chmod +x ${base_run_file}`);
		await ssh.command(`sudo echo -e "cd ${base_home}\n$(cat ${base_run_file})" > ${base_run_file}`);
		await ssh.command(base_run_file);
		// await ssh.command(`rm -rf ${base_run_file}`);

		console.log(`Completed base software installation.`);

	} catch (error) {

		console.log(error);

	} finally {

		await ssh.disconnect();

	}

})();

// Docker
// await ssh.command('sudo yum install -y docker');
// await ssh.command('sudo systemctl enable docker');
// await ssh.command('sudo systemctl start docker');
// await ssh.command('sudo curl -L https://github.com/docker/compose/releases/download/1.25.1/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose');
// await ssh.command('sudo chmod +x /usr/local/bin/docker-compose');
// await ssh.command('sudo usermod -aG docker ec2-user');
// await ssh.command('docker info');
// await ssh.command('docker-compose --version');