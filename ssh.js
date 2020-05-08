"use strict";

const path = require('path');
const node_ssh = require('node-ssh');

const ssh = new node_ssh();

const ping = async params => {
    
    try {

        await connect(params);

        await disconnect(params);

        return true;
        
    } catch (error) {

        return false;
        
    }
    
}; 

const connect = async (params) => {

    console.log(`Connecting to instance: ${params.host}`);

    await ssh.connect(params);

};

const disconnect = async () => {

    console.log("Disconnected from instance");

    await ssh.dispose();

};

const command = async (comm, params = [], cwd = "/tmp") => {

    const p = Array.isArray(params) ? params : [params];

    const out = await ssh.exec(comm, p, { cwd, stream: 'stdout', options: { pty: true } });

    console.log(">", out);

    return out;

};

const putfile = async (from, to) => {

    await ssh.putFile(from, to);

    console.log(">", `Copied local ${from} to remote ${to}`);

};
const putdir = async (from, to) => {

    const status = await ssh.putDirectory(from, to, {
        recursive: true,
        concurrency: 1,
        validate: function (itemPath) {
            const baseName = path.basename(itemPath)
            return baseName.substr(0, 1) !== '.' && // do not allow dot files
                baseName !== 'node_modules' // do not allow node_modules
        }
    });

    if (status) { console.log(">", `Directory local ${from} copied to remote ${to} successfully`); }
    else { 
        console.log(">", `Directory local ${from} copied to remote ${to} with errors`);
        throw new Error("Directory copy error");
    }

};

module.exports = { command, putfile, putdir, connect, disconnect, ping };






