var cache_manager = require('cache-manager');
var md5 = require('MD5');
var s3 = new (require('aws-sdk')).S3({params:{Bucket: process.env.S3_BUCKET_NAME}});

module.exports = {
    init: function() {
        this.cache = cache_manager.caching({
            store: s3_cache
        });
    },

    beforePhantomRequest: function(req, res, next) {
        if(req.method !== 'GET') {
            return next();
        }

        this.cache.get(md5(req.prerender.url), function (err, result) {
            if (!err && result) {
                console.log('cache hit', req.prerender.url);
                res.send(200, result.Body);
            } else {
                next();
            }
        });
    },

    afterPhantomRequest: function(req, res, next) {
        this.cache.set(req.prerender.url, req.prerender.documentHTML);
        next();
    }
};


var s3_cache = {
    get: function(key, callback) {
        if (process.env.S3_PREFIX_KEY) {
            key = process.env.S3_PREFIX_KEY + '/' + key;
        }

        s3.getObject({
            Key: key
        }, callback);
    },
    set: function(key, value, callback) {
        if (process.env.S3_PREFIX_KEY) {
            key = process.env.S3_PREFIX_KEY + '/' + key;
        }
        var request = s3.putObject({
            Key: md5(key),
            ContentType: 'text/html;charset=UTF-8',
            StorageClass: 'REDUCED_REDUNDANCY',
            Body: value
        }, callback);

        if (!callback) {
            console.log('send');
            request.send();
        }
    }
};
