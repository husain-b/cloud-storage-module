const AWS = require('aws-sdk');
module.exports = class S3Storage {

    constructor(config){
        this.s3 = new AWS.S3(config);
    }

    uploadFile = (params) => {
        const { buffer, bucket, filePath } = params;
        const s3UploadRequest = this.s3.upload({
            Bucket: bucket,
            Key: `${filePath}`,
            Body : buffer,
            ACL: "private",
        });
        
        return new Promise((resolve, reject) => {
            s3UploadRequest
            .promise()
            .then(result => resolve({
                Location : result.Location,
                Bucket : result.Bucket,
                Key : result.Key
            }))
            .catch(err => reject(err));
        });

    }

    getSignedUrl = (filePath, options) => {
        const { 
            operation = 'getObject', 
            acl = 'private',
            contentType, 
            bucket, 
            expires,
        } = options;

        const params = {
            Bucket: bucket,
            Expires: expires,
            Key: filePath
        };
        if (operation === 'putObject') {
            params.ACL = acl;
            params.ContentType = contentType || 'binary/octet-stream';
        }

        return new Promise((resolve, reject) => {
            if(operation === 'putObject') {
                resolve(this.s3.getSignedUrl(operation, params))
            }
            this.s3.headObject({ Bucket : bucket, Key : filePath }).promise()
            .then(_ => resolve(this.s3.getSignedUrl(operation, params)))
            .catch(error => reject(error))
        })
    }

    generateSignedPostPolicy = (params) => {
        const { bucket, expires, key, fields = {}, conditions = [] } = params;

        const options = {
            Bucket: bucket,
            Conditions: [
                ...conditions,
                key.endsWith('${filename}') 
                    ? ['starts-with', '$key', key.split('${filename}')[0]]
                    : { key }
            ],
            Fields: { ...fields },
            Expires: expires,
        };

        return new Promise((resolve, reject) => {
            this.s3.createPresignedPost(options, (err, data) => {
                if(err) reject(err);
                data.fields.key = key;
                resolve(data);
            });
        })
    }

    getFileBuffer = async (filePath, params) => {
        const { bucket } = params;

        return new Promise((resolve, reject) => {
            this.s3.getObject({
                Bucket : bucket,
                Key : filePath
            })
            .promise()
            .then(res => resolve(res.Body))
            .catch(error => reject(error));
        })
    }
    
}