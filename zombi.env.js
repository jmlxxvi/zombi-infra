const fs = require('fs');

const create_env_file = (file_name = "zombi_env")  => {

    let ZOMBI_ENV = "";

    Object.keys(process.env).forEach(key => {
        // Anything we want to put into deployment environment
        if(
            (key.substr(0, 5) === "ZOMBI" || key === "NODE_ENV") &&
            key.substr(0, 10) !== "ZOMBI_TEST"
        ) {
            ZOMBI_ENV += `export ${key}=${process.env[key]}\n`;
        }
    });
    
    fs.writeFileSync(`${__dirname}/${file_name}`, ZOMBI_ENV);

    return `${__dirname}/${file_name}`;

}

module.exports = { create_env_file };