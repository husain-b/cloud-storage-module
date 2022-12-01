const S3Storage = require("./s3");
const GCSStorage = require("./gcs");
class CloudStorage {

    constructor(storageService, storageAccountConfig, bucket){
        this.storageService = storageService;
        this.bucket = bucket;
        switch(storageService) {
            case 'S3' : this.storage = new S3Storage(storageAccountConfig)
            break;
            case 'GCS' : this.storage = new GCSStorage(storageAccountConfig)
            break;
        }
    }

    static Expires = 5 * 60 // 5 minutes

    getSignedUrl = (filePath, options = {}) => {
        const { expires = CloudStorage.Expires, bucket = this.bucket } = options;
        options['expires'] = expires;
        options['bucket'] = bucket;
        return new Promise(async (resolve, reject) => {
            try {
                const presigned_url = await this.storage.getSignedUrl(filePath, options);
                resolve({ presigned_url, success : true, expires_in : expires });
            } catch (error) {
                const errorObj = { stack : error, success : false, message : 'Internal Server Error', code : 500 };
                if(error.statusCode === 404) reject({ ...errorObj, message : 'File Not Found', code : 404 });
                reject(errorObj);
            }
        });
    }

    uploadFile = (params) => {
        const { bucket = this.bucket, acl = 'private', timeout } = params;
        params['acl'] = acl;
        params['bucket'] = bucket;
        return new Promise(async (resolve, reject) => {
            try{
                if(timeout) {
                    const timeoutPromise = new Promise((res, rej) => { setTimeout(() => { rej({ code : 408 })}, timeout) });
                    const uploadResult = await Promise.race([this.storage.uploadFile(params), timeoutPromise]);
                    resolve(uploadResult);
                }
                resolve(this.storage.uploadFile(params));
            } catch(error){
                if(error.code === 408) reject({ message : 'File Upload Timed Out', code : 408 });
                reject({ stack : error, message : 'Internal Server Error', code : 500 });
            }
        });
    }

    generateSignedPostPolicy = (params) => {
        const { bucket = this.bucket, expires = CloudStorage.Expires } = params;
        params['expires'] = expires;
        params['bucket'] = bucket;
        return new Promise(async (resolve, reject) => {
            try {
                const res =  await this.storage.generateSignedPostPolicy(params);
                resolve(res);
            } catch(error) {
                reject({ stack : error, message : 'Internal Server Error', code : 500 });
            }
        });  
    }

    getFileBuffer = (filePath, params = {}) => {
        const { bucket = this.bucket } = params;
        params['bucket'] = bucket;
        return new Promise(async (resolve, reject) => {
            try {
                const buffer = await this.storage.getFileBuffer(filePath, params);
                resolve({ buffer , success : true });
            } catch(error) {
                reject({ stack : error, success : false });
            }
        })
    }

}

module.exports = CloudStorage;
