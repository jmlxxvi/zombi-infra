# OS
#sudo yum -y update
sudo yum -y install rpm-build yum-utils wget net-tools gcc glibc curl gcc-c++ make tcl openssl openssl-devel pcre-devel epel-release certbot python2-certbot-nginx

# Node
curl -sL https://rpm.nodesource.com/setup_12.x | sudo bash -
sudo yum -y install nodejs
node -v

# Redis
sudo yum -y install redis
sudo sed -i "s/^# requirepass foobared/requirepass ${ZOMBI_CACHE_PASSWORD}/" /etc/redis.conf
sudo systemctl start redis
sudo systemctl enable redis
sudo systemctl status redis

# PostgeSQL
wget -P /tmp https://download.postgresql.org/pub/repos/yum/11/redhat/rhel-7.5-x86_64/pgdg-centos11-11-2.noarch.rpm
sudo yum -y install /tmp/pgdg-centos11-11-2.noarch.rpm
sudo yum -y install postgresql11 postgresql11-server postgresql11-contrib
sudo /usr/pgsql-11/bin/postgresql-11-setup initdb
sudo sed -i "s/ident/md5/" /var/lib/pgsql/11/data/pg_hba.conf
sudo systemctl start postgresql-11
sudo systemctl enable postgresql-11
sudo systemctl status postgresql-11
sudo -u postgres psql -c "CREATE USER ${ZOMBI_DB_USER} WITH PASSWORD '${ZOMBI_DB_PASS}';"
sudo -u postgres psql -c "CREATE DATABASE ${ZOMBI_DB_NAME} OWNER=${ZOMBI_DB_USER};"

# MySQL (MariaDB)
sudo yum -y install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo systemctl status mariadb
sudo mysql -e "create database if not exists ${ZOMBI_DB_NAME}"
sudo mysql -e "create user '${ZOMBI_DB_USER}'@'localhost' identified by '${ZOMBI_DB_PASS}'"
sudo mysql -e "grant all privileges on ${ZOMBI_DB_NAME}.* to '${ZOMBI_DB_USER}'@'localhost'"
# For latest MariaDB version use:
#  curl -sS https://downloads.mariadb.com/MariaDB/mariadb_repo_setup | sudo bash
#  sudo yum install MariaDB-server galera-4 MariaDB-client MariaDB-shared MariaDB-backup MariaDB-common
# Backup/Restore example
#  mysqldump --host myrdshost.rds.amazonaws.com --user=admin --password --lock-tables --databases my_db > my_db_full.sql
#  mysql -h localhost -u my_user -p my_db < my_db_full.sql


# PM2
sudo npm i -g pm2
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u centos --hp /home/centos

# Nginx
sudo yum -y install nginx
#sudo mkdir -p /etc/tls
#sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/tls/cert.key -out /etc/tls/cert.crt -subj "/C=AR/ST=Buenos Aires/L=Buenos Aires/O=Zombi Server Self Signed/OU=Development Server/CN=${ZOMBI_LB_HOST_NAME}"
#sudo `which cp` ./nginx.conf /etc/nginx/nginx.conf
sudo systemctl start nginx
sudo systemctl enable nginx
sudo systemctl status nginx
