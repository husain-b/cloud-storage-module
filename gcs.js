const { Storage } = require('@google-cloud/storage');

module.exports = class GCSStorage {

    constructor(config) {
        if(config.default_creds) 
            this.storage = new Storage({ credentials : config });
        else 
            this.storage = new Storage();
    }

    uploadFile = (params) => {
        const { buffer, filePath, bucket } = params;
        return new Promise((resolve, reject) => {
            this.storage.bucket(bucket).file(filePath)
            .save(buffer)
            .then(_ => resolve({ 
                Location : `https://storage.cloud.google.com/${bucket}/${filePath}`,
                Bucket : bucket,
                Key : filePath 
            }))
            .catch(error => reject(error));
        });
    }

    getSignedUrl = async (filePath, options) => {
        const { 
            operation = 'getObject', 
            contentType, 
            bucket, 
            expires 
        } = options;

        const params = {
            version: 'v4',
            expires: Date.now() + (1000 * expires),
            responseDisposition: "attachment",
        };

        if (operation === 'putObject') {
            params.action = 'write';
            params.contentType = contentType || 'application/octet-stream';
        } else {
            params.action = 'read';
        }

        const file = this.storage.bucket(bucket).file(filePath);

        return new Promise((resolve, reject) => {

            file.exists()
            .then(([fileExists]) => {
                if(!fileExists && operation === "getObject") throw new Error("Not Found");
                return file.getSignedUrl(params);
            })
            .then(([url]) => resolve(url))
            .catch(error => {
                if(error.message === "Not Found") reject({ statusCode : 404 })
                reject(error);
            });
        });
    }

    generateSignedPostPolicy = (params) => {
        const { bucket, expires, key, fields = {}, conditions = [] } = params;
        const file = this.storage.bucket(bucket).file(key);

        const options = {
          expires: Date.now() + (1000 * expires),
          fields,
          conditions
        };

        return new Promise((resolve, reject) => {
            file.generateSignedPostPolicyV4(options)
            .then(([res]) => resolve(res))
            .catch(error => reject(error))
        })
    }

    getFileBuffer = async (filePath, params) => {
        const { bucket } = params;

        return new Promise((resolve, reject) => {
            this.storage.bucket(bucket).file(filePath).download({})
            .then(([res]) => resolve(res))
            .catch(error => reject(error));
        });
    }
}