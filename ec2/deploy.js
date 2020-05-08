"use strict";

const config = require("../config");
const ssh = require("../ssh");
const zombi_env = require("../zombi.env");

const fs = require('fs');

(async () => {

	try {

		zombi_env.create_env_file();

		const instance_public_dns_name = fs.readFileSync(`${__dirname}/server.name`).toString();

		const deploy_home = `/home/${config.aws.ssh.username}/zombi-server`;
		const deploy_env_file = `${deploy_home}/.env`;

		await ssh.connect({
			host: instance_public_dns_name,
			username: config.aws.ssh.username,
			privateKey: config.aws.ssh.key_file
		});

		const zombi_env_file = zombi_env.create_env_file();

		await ssh.putfile(zombi_env_file, deploy_env_file);

		await ssh.command("source .env; pm2 delete all", [], deploy_home);

		await ssh.command(`rm -rf ${deploy_home}/server`);

		await ssh.putdir(`${__dirname}/../../../server`, `${deploy_home}/server`);

		await ssh.putdir(`${__dirname}/../../../public`, `${deploy_home}/public`);

		await ssh.putfile(`${__dirname}/../../../ecosystem.config.js`, `${deploy_home}/ecosystem.config.js`);
		await ssh.putfile(`${__dirname}/../../../package-lock.json`, `${deploy_home}/package-lock.json`);
		await ssh.putfile(`${__dirname}/../../../package.json`, `${deploy_home}/package.json`);

		await ssh.command("npm i", [], deploy_home);

		await ssh.command("source .env; npm run schema", [], deploy_home);

		await ssh.command("source .env; pm2 start", [], deploy_home);

		console.log(`Completed deploy to ${instance_public_dns_name}`);

	} catch (error) {

		console.log(error);

	} finally {

		await ssh.disconnect();

	}

})();

// Docker
// await ssh.putfile(`${__dirname}/../docker/docker-app`, `${deploy_home}/docker-app`);
// await ssh.putfile(`${__dirname}/../docker/docker-compose.yml`, `${deploy_home}/docker-compose-noenv.yml`);
// await ssh.putfile(`${__dirname}/../docker/docker-compose.yml`, `${deploy_home}/docker-compose.yml`);
// await ssh.command(`source .env; envsubst < "docker-compose-noenv.yml" > "docker-compose.yml";`, [], deploy_home);






