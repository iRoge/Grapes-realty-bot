export default class Proxy {
    id = null
    status = null
    ip = null
    port = null
    protocol = null
    login = null
    password = null
    sourceId = null

    static getPropsToInsertMap()
    {
        return {
            status: 'status',
            ip: 'ip',
            port: 'port',
            protocol: 'protocol',
            login: 'login',
            password: 'password',
            sourceId: 'source_id',
        };
    }

    getProxyUrl()
    {
        let loginPassword = null;
        if (this.login && this.password) {
            loginPassword = this.login + ':' + this.password + '@';
        }

        if (loginPassword) {
            return this.protocol + '://' + loginPassword + this.ip + ':' + this.port;
        } else {
            return this.protocol + '://' + this.ip + ':' + this.port;
        }
    }
}