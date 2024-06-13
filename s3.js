const { S3Client, GetObjectCommand, PutObjectCommand, CreatePresignedPostCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

module.exports = class S3Storage {

    constructor(config){
        const config = {
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
            forcePathStyle: true,
        };
        if (process.env.ENDPOINT) {
            config.endpoint = process.env.ENDPOINT;
            config.region = "us-east-1";
        } else {
            if (!process.env.AWS_REGION) 
                throw new Error("AWS_REGION Environment variable not found.");
            config.region = process.env.AWS_REGION;
        }
        this.s3 = new S3Client(config);
    }

    uploadFile = (params) => {
        const { buffer, bucket, acl, filePath } = params;
        const uploadParams = {
            Bucket: bucket,
            Key: filePath,
            Body: buffer,
            ACL: acl,
        };

        return new Promise((resolve, reject) => {
            this.s3.send(new PutObjectCommand(uploadParams))
                .then(result => resolve({
                    Location: `https://${bucket}.s3.amazonaws.com/${filePath}`,
                    Bucket: result.Bucket,
                    Key: result.Key
                }))
                .catch(err => reject(err));
        });
    }

    getSignedUrl = async (filePath, options) => {
        const { operation = 'getObject', acl = 'private', contentType, bucket, expires } = options;
        const params = {
            Bucket: bucket,
            Key: filePath,
            Expires: expires
        };

        if (operation === 'putObject') {
            params.ACL = acl;
            params.ContentType = contentType || 'binary/octet-stream';
        }

        try {
            if (operation === 'putObject') {
                const command = new CreatePresignedPostCommand(params);
                const signedUrl = await this.s3.getSignedUrl(command);
                return signedUrl;
            } else {
                await this.s3.send(new HeadObjectCommand({ Bucket: bucket, Key: filePath }));
                const command = new GetObjectCommand(params);
                const signedUrl = await this.s3.getSignedUrl(command);
                return signedUrl;
            }
        } catch (error) {
            throw error;
        }
    }

    generateSignedPostPolicy = async (params) => {
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

        try {
            const command = new CreatePresignedPostCommand(options);
            const data = await this.s3.send(command);
            data.fields.key = key;
            return data;
        } catch (error) {
            throw error;
        }
    }

    getFileBuffer = async (filePath, params) => {
        const { bucket } = params;
        const getObjectParams = {
            Bucket: bucket,
            Key: filePath
        };

        try {
            const command = new GetObjectCommand(getObjectParams);
            const data = await this.s3.send(command);
            return data.Body;
        } catch (error) {
            throw error;
        }
    }
}
