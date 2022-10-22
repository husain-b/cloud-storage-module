const S3Storage = require("./s3");
const GCSStorage = require("./gcs");
class CloudStorage {

    constructor(storageService, storageAccountConfig, bucket){
        this.storageService = storageService;
        this.bucket = bucket;
        switch(storageService) {
            case "S3" : this.storage = new S3Storage(storageAccountConfig)
            break;
            case "GCS" : this.storage = new GCSStorage(storageAccountConfig)
            break;
        }
    }

    static Expires = 5 * 60 // 5 minutes

    getSignedUrl = async (filePath, options = {}) => {
        const { expires = CloudStorage.Expires, bucket = this.bucket } = options;
        options["expires"] = expires;
        options["bucket"] = bucket;
        try {
            const presigned_url = await this.storage.getSignedUrl(filePath, options);
            return { presigned_url, success : true, expires_in : expires };
        } catch (error) {
            const errorObj = { error, success : false, message : 'Internal Server Error', code : 500 }
            if(error.statusCode === 404) return { ...errorObj, message : 'File Not Found', code : 404 }
            return errorObj;
        }
    }

    uploadFile = (params) => {
        const { bucket = this.bucket } = params;
        params["bucket"] = bucket;
        try{
            const uploadResult = this.storage.uploadFile(params);
            return uploadResult
        } catch(error){
            return { error, message : 'Internal Server Error', code : 500 }
        }
    }

    generateSignedPostPolicy = async (params) => {
        const { bucket = this.bucket, expires = CloudStorage.Expires } = params;
        params["expires"] = expires;
        params["bucket"] = bucket;
        try {
            const res =  await this.storage.generateSignedPostPolicy(params);
            return res;
        } catch(error) {
            return { error, message : 'Internal Server Error', code : 500 }
        }
    }

    getFileBuffer = async (filePath, params = {}) => {
        const { bucket = this.bucket } = params;
        params['bucket'] = bucket;

        try {
            const buffer = await this.storage.getFileBuffer(filePath, params);
            return { buffer , success : true };
        } catch(error) {
            return { error, suucess : false };
        }
    }

}

module.exports = CloudStorage;
