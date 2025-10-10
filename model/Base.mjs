
/**
 * This module is the Javascript interface to the internal Sobamail objects.
 *
 * It is closely tied to a particular version of Sobamail runtime and typically shipped as hardcoded
 * data inside Sobamail platform binaries.
 */

export const namespace = "https://sobamail.com/module/base/v1";

import "soba://computer/R1"

function isString(s) { return (typeof s === "string" || s instanceof String); }

export class DeleteRow {
    static KEY = `{${namespace}}${this.name}`;

    constructor({database = null, table = null, hashAlgorithm = null, hashDigest = null} = {}) {
        this.database = database;
        this.table = table;
        this.hashAlgorithm = hashAlgorithm;
        this.hashDigest = hashDigest;
    }

    asText(locale) {
        return `Delete row ${this.hashAlgorithm}(${this.hashDigest}) from database '${
                this.database}' table '${this.table}'`;
    }

    toString() {
        return `DeleteRow('${this.database}', '${this.table}', '${this.hashAlgorithm}', '${
                this.hashDigest}")`;
    }
}

export class NotFoundError extends Error {
    constructor(id, type) {
        const message = "Query returned nothing";

        let cause;
        if (type) {
            cause = {id : id, type : type};
        }
        else {
            cause = {id : id};
        }

        super(message, cause);
    }
}

export class BlobDataReadError extends Error {
    constructor(blobId, errCode, errText) {
        const message = `Blob data could not be read`;
        const cause = {blobId : blobId, errCode : errCode, errText : errText};

        super(message, {cause : cause});
    }
}

export class BlobTransform {
    constructor(key) { this.key = key; }
}

export class BlobTransformOffset extends BlobTransform {
    static KEY = 0;

    constructor(offset) {
        super(BlobTransformOffset.KEY);

        this.offset = offset;
    }

    toJSON() { return this.offset; }

    validate() {
        if (! (Number.isInteger(this.offset) && this.offset >= 0)) {
            throw new Error(`Invalid length value '${this.offset}'. Must be a positive integer`);
        }
    }
}

export class BlobTransformLength extends BlobTransform {
    static KEY = 1;

    constructor(length) {
        super(BlobTransformLength.KEY);

        this.length = length;
    }

    toJSON() { return this.length; }

    validate() {
        if (! (Number.isInteger(this.length) && this.length >= 0)) {
            throw new Error(`Invalid length value '${this.length}'. Must be a positive integer`);
        }
    }
}

export class BlobTransformEncoding extends BlobTransform {
    static KEY = 2;

    static Identity = 0;
    static Base64 = 1;

    constructor(encoding) {
        super(BlobTransformEncoding.KEY);

        this.encoding = encoding;
    }

    toJSON() { return this.encoding; }

    validate() {
        if (! (this.encoding === BlobTransformEncoding.Identity
                    || this.encoding === BlobTransformEncoding.Base64)) {
            throw new Error(`Invalid encoding value '${
                    this.encoding}'. Must be one of [BlobTransformEncoding.Identity, BlobTransformEncoding.Base64]`);
        }
    }
}

class BlobTransformNewlineBase extends BlobTransform {
    constructor(key, nlfEntries) {
        super(key);

        this.nlfEntries = nlfEntries
    }

    toJSON() { return this.nlfEntries; }

    validate() {
        if (! (Array.isArray(this.nlfEntries) && this.nlfEntries.length > 0)) {
            throw new Error(`Invalid nlfEntries value '${
                    JSON.stringify(
                            this.nlfEntries)}'. Must be a non-empty Array of Array instances`);
        }

        let idx = 0;
        for (const e of this.nlfEntries) {
            if (! (Array.isArray(e) && e.length != 2)) {
                throw new Error(
                        `Invalid nlfEntries[${idx}] value '${e}'. Must be a pair of integers`);
            }

            const numBytes = e[0];
            const numTimes = e[1];

            if (! (Number.isInteger(numBytes) && numBytes > 1)) {
                throw new Error(
                        `Invalid nl freq '${numBytes}'. Must be a strictly positive integer`);
            }

            if (! (Number.isInteger(numTimes) && numTimes > 1)) {
                throw new Error(
                        `Invalid nl count '${numTimes}'. Must be a strictly positive integer`);
            }

            ++idx;
        }
    }
}

export class BlobTransformNewlineN extends BlobTransformNewlineBase {
    static KEY = 3
    constructor(numBytes, numTimes) { super(BlobTransformNewlineN.KEY, numBytes, numTimes); }
}

export class BlobTransformNewlineRN extends BlobTransformNewlineBase {
    static KEY = 5
    constructor(numBytes, numTimes) { super(BlobTransformNewlineRN.KEY, numBytes, numTimes); }
}

export class BlobTransformCharset extends BlobTransform {
    static KEY = 6;

    constructor(charset) {
        super(BlobTransformCharset.KEY);

        this.charset = charset;
    }

    toJSON() { return {charset : this.charset}; }

    validate() {
        if (! (isString(this.charset) && this.charset.length > 1)) {
            // TODO: Maybe validate this against the list of supported codecs?
            throw new Error(`Invalid charset value '${this.charset}'. Must be a non-empty String`);
        }
    }
}

export class Blob {
    static MAX_SIZE = 1 << 30;

    static Sha1 = 1;
    static Sha224 = 2;
    static Sha256 = 3;
    static Sha512 = 4;
    static Sha384 = 5;

    static CMPR_UNKNOWN = -1;
    static CMPR_NULL = 0;
    static CMPR_Z = 1;
    static CMPR_XZ = 2;
    static CMPR_ZSTD = 5;

    #transforms;

    constructor({
        blobId = "",
        sizes = new Map(),
        digests = new Map(),
        data = null,
        transforms = new Map()
    } = {}) {
        this.blobId = blobId;
        this.sizes = sizes;
        this.digests = digests;
        this.data = data;
        this.transforms = transforms;

        this.validateInstance();
    }

    isInline() { return this.data !== null; }

    get transforms() { return this.#transforms }

    set transforms(v) {
        this.#transforms = v;
        this.validateTransforms();
    }

    set size(v) {
        if (this.isInline()) {
            throw new Error("Inline blob size is read-only");
        }

        return this.sizes.set(CMPR_NULL, v)
    }

    get size() {
        if (this.data) {
            return this.data.byteLength;
        }
        if (! this.sizes.has(CMPR_NULL)) {
            return 0;
        }
        return this.sizes.get(CMPR_NULL)
    }

    toJSON() {
        if (this.data) {
            return this.data;
        }

        let retval = {
            blobId : this.blobId,
            sizes : Object.fromEntries(this.sizes),
            digests : Object.fromEntries( //
                    Object.entries(Object.fromEntries(this.digests)).map((e) => { //
                        return [ e[0], Object.fromEntries(e[1]) ];
                    })),
        };

        if (this.transforms.size > 0) {
            retval.transforms = Object.fromEntries(this.transforms);
        }

        return retval;
    }

    toMsgpack() {
        let retval;

        if (this.data) {
            retval = this.data;
        }
        else {
            retval = [ this.blobId, this.sizes, this.digests ];
            if (this.transforms) {
                retval.push(this.transforms);
            }
        }

        return retval;
    }

    isValid() {
        try {
            this.validate();
            return true;
        }
        catch (e) {
            return false;
        }
    }

    validateTransforms() {
        if (! (this.transforms instanceof Map)) {
            throw new Error(`Invalid transforms value '${
                    JSON.stringify(this.transforms)}'. Must be a Map of BlobTransform instances`);
        }

        let new_xforms = new Map();
        let changed = false;
        for (let [k, v] of this.transforms) {
            switch (k) {
            case BlobTransformOffset.KEY:
                if (! (v instanceof BlobTransformOffset)) {
                    v = new BlobTransformOffset(v);
                    changed = true;
                }
                v.validate();
                new_xforms.set(BlobTransformOffset.KEY, v);
                break;

            case BlobTransformLength.KEY:
                if (! (v instanceof BlobTransformLength)) {
                    v = new BlobTransfoBlobTransformLengthrmCharset(v);
                    changed = true;
                }
                v.validate();
                new_xforms.set(BlobTransformLength.KEY, v);
                break;

            case BlobTransformEncoding.KEY:
                if (! (v instanceof BlobTransformEncoding)) {
                    v = new BlobTransformEncoding(v);
                    changed = true;
                }
                v.validate();
                new_xforms.set(BlobTransformEncoding.KEY, v);
                break;

            case BlobTransformNewlineN.KEY:
                if (! (v instanceof BlobTransformNewlineN)) {
                    v = new BlobTransformNewlineN(v);
                    changed = true;
                }
                v.validate();
                new_xforms.set(BlobTransformNewlineN.KEY, v);
                break;

            case BlobTransformNewlineRN.KEY:
                if (! (v instanceof BlobTransformNewlineRN)) {
                    v = new BlobTransformNewlineRN(v);
                    changed = true;
                }
                v.validate();
                new_xforms.set(BlobTransformNewlineRN.KEY, v);
                break;

            case BlobTransformCharset.KEY:
                if (! (v instanceof BlobTransformCharset)) {
                    v = new BlobTransformCharset(v);
                    changed = true;
                }
                v.validate();
                new_xforms.set(BlobTransformCharset.KEY, v);
                break;

            default:
                // FIXME: Improve error message generation
                throw new Error(`Invalid transforms key '${k}'. Must be one of [0,1,2,3,5,6]`);
            }
        }

        if (changed) { // prevent setter stack overflow
            this.transforms = new_xforms;
        }
    }

    validateInstance() {
        if (this.data) {
            if (this.data.byteLength === 0) {
                throw new Error("An inline blob must have non-empty data");
            }

            if (this.blobId.length !== 0) {
                throw new Error("An inline blob must have empty blob id");
            }

            if (this.sizes.size !== 0) {
                throw new Error("An inline blob must have empty sizes map");
            }

            if (this.digests.size !== 0) {
                throw new Error("An inline blob must have empty digests map");
            }
        }
        else {
            this.validateTransforms();
        }
    }

    validate() {
        this.validateInstance();

        // validate data
        if (! (this.data === null
                    || (this.data instanceof ArrayBuffer && this.data.byteLength > 0))) {
            throw new Error(
                    `Invalid data value '${data}'. Must be null or a non-empty ArrayBuffer`);
        }

        // validate blobId
        if (this.data === null) { // if this blob has no inline data, it must have a blobId
            if (! (soba.type.blobId.isValid(this.blobId))) {
                throw new Error(`Invalid blobId value '${this.blobId}'. Must match regexp '${
                        soba.type.blobId.pattern}' when there is no inline data. ${this.data}`);
            }
        }
        else {
            if (this.blobId) {
                throw new Error(`Invalid blobId value '${
                        this.blobId}'. Must be empty when inline data is present`);
            }
        }

        // validate sizes
        for (let a of Object.entries(this.sizes)) {
            a[0] = parseInt(a[0]);
            a[1] = parseInt(a[1]);
            if (! Number.isInteger(a[0])) {
                throw new Error(`Invalid size key '${a[0]}'. Must be a positive integer`);
            }

            if (! Number.isInteger(a[1])) {
                throw new Error(`Invalid size value '${a[1]}'. Must be a positive integer`);
            }

            if (a[0] < 0) {
                throw new Error(`Invalid size key '${a[0]}'. Must be a positive integer`);
            }

            if (a[1] < 1) {
                throw new Error(
                        `Invalid size value '${a[1]}'. Must be a strictly positive integer`);
            }

            if (a[1] > Blob.MAX_SIZE) {
                throw new Error(`Invalid size value '${a[1]}'. Blob.MAX_SIZE=${Blob.MAX_SIZE}`);
            }
        }

        // validate digests
        for (let [c, digests] of Object.entries(this.digests)) {
            c = parseInt(c);

            if (! Number.isInteger(c)) {
                throw new Error(`Invalid compression key '${c}'. Must be a positive integer`);
            }

            for (let [d, digest] of Object.entries(digests)) {
                d = parseInt(d);
                if (! Number.isInteger(d)) {
                    throw new Error(`Invalid digest key '${d}'. Must be a positive integer`);
                }

                if (! (digest instanceof ArrayBuffer)) {
                    throw new Error(
                            `Invalid digest value '${a[0]}'. Must be a non-empty ArrayBuffer`);
                }

                if (! (/*   */ (d === Blob.Sha1) //
                            || (d === Blob.Sha224) //
                            || (d === Blob.Sha256) //
                            || (d === Blob.Sha384) //
                            || (d === Blob.Sha512))) {
                    throw new Error(`Invalid digest key '${a[0]}'`);
                }

                if (! (/*   */ (d === Blob.Sha1 && digest.byteLength === 20)
                            || (d === Blob.Sha224 && digest.byteLength === 28)
                            || (d === Blob.Sha256 && digest.byteLength === 32)
                            || (d === Blob.Sha384 && digest.byteLength === 48)
                            || (d === Blob.Sha512 && digest.byteLength === 64))) {
                    throw new Error(`Invalid digest size '${digest}' given digest key '${a[0]}'`);
                }
            }
        }
    }
}

export class EmailAddress {
    constructor({name = "", address} = {}) {
        this.name = name;
        this.address = address;
    }

    toJSON() { return {name : this.name, address : this.address}; }

    isValid() {
        try {
            this.validate();
            return true;
        }
        catch (e) {
            return false;
        }
    }

    validate() {
        if (! (isString(this.name))) {
            throw new Error(`Invalid name value '${JSON.stringify(this.name)}' . Must be a String`);
        }

        if (! (isString(this.address) && this.address.length > 0)) {
            throw new Error(`Invalid address value '${
                    JSON.stringify(this.address)}'. Must be a non-empty String`);
        }
    }
}

export class MessageAttributes {
    // TODO
    constructor({} = {}) {}
}

export class MessageBody {
    static Inline = 1;
    static Attachment = 2;

    #blobs;

    constructor({
        content = null,
        contentId = null,
        type = "application/octet-stream",
        disposition = MessageBody.Inline,
        blobs = [],
        charset = null,
    } = {}) {
        // charset assignment must be made before content assignment since content setter in child
        // classes can override charset value
        this.charset = charset;

        this.content = content;
        this.contentId = contentId;
        this.type = type;
        this.disposition = disposition;
        this.blobs = blobs;
    }

    get blobs() { return this.#blobs; }
    set blobs(v) { this.#blobs = this.adaptBlobs(v); }

    adaptBlobs(blobs) {
        let retval = [];

        let idx = 0;
        for (const blob of blobs) {
            if (blob instanceof Blob) {
                retval.push(blob);
            }
            else if (blob instanceof ArrayBuffer) {
                retval.push(new Blob({data : blob}));
            }
            else if (isString(blob)) {
                throw new Error("Invalid blob value: Must be an Object or ArrayBuffer");
            }
            else {
                retval.push(new Blob(blob));
            }

            ++idx;
        }

        return retval;
    }

    isValid() {
        try {
            this.validate();
            return true;
        }
        catch (e) {
            return false;
        }
    }

    validate() {
        // validate content
        const have_blobs = this.blobs.length > 0;
        const have_content = (! (this.content === null || this.content === undefined));

        if (have_blobs && have_content) {
            throw new Error(
                    "Invalid object state: Exactly one of `[this.blobs, this.content]` must be non-null");
        }
        else if (have_blobs) {
            if (! Array.isArray(this.blobs)) {
                throw new Error(`Invalid blobs value: Must be a non-empty array of blobs`);
            }

            if (! (this.blobs.length > 0)) {
                throw new Error(`Invalid blobs value: Must be a non-empty array of blobs`);
            }
        }
        else if (have_content) {
            // validated in child classes
        }
        else {
            throw new Error(
                    "Invalid object state: Exactly one of `[this.blobs, this.content]` must be non-null");
        }

        // validate disposition
        if (this.disposition == "inline") {
            this.disposition = MessageBody.Inline;
        }
        else if (this.disposition == "attachment") {
            this.disposition = MessageBody.Attachment;
        }

        if (! (this.disposition === MessageBody.Inline
                    || this.disposition === MessageBody.Attachment)) {
            throw new Error(`Invalid disposition value '${this.disposition}'. Must be one of: ` +
                    `[MessageBody.Inline, MessageBody.Attachment, "inline", "attachment"]`);
        }

        if (! this.contentId) {
            this.contentId = "";
        }
        else if (! (isString(this.contentId) && this.contentId.length > 0)) {
            throw new Error(
                    `1 Invalid contentId value '${this.contentId}'. Must be a non-empty String`);
        }

        if (! (isString(this.type) && this.type.length > 0)) {
            throw new Error(`Invalid type value '${this.type}'. Must be a non-empty String`);
        }

        // TODO: this.type must be a valid mime type
    }

    blobify() { throw new Error("must be overridden"); }
}

export class MessageBodyText extends MessageBody {
    constructor({
        content = null,
        contentId = null,
        disposition = MessageBody.Inline,
        blobs = [],
        language = null,
        charset = null,
    } = {}) {
        super({
            content : content,
            contentId : contentId,
            type : "text/plain",
            disposition : disposition,
            blobs : blobs,
            charset : charset,
        });
        this.language = language;
    }

    set content(v) {
        if (isString(v)) {
            v = soba.text.encode(v).buffer;
            this.charset = "UTF-8";
        }

        super.content = v
    }

    toJSON() {
        let blobs = [];
        for (const blob of this.blobs) {
            blobs.push(blob.toJSON());
        }

        let retval = {
            content : this.content,
            contentId : this.contentId,
            type : this.type,
            disposition : this.disposition,
            charset : this.charset,
            blobs : blobs,

        };

        if (this.language) {
            retval.language = this.language;
        }

        return retval;
    }

    toMsgpack() {
        let blobs = [];
        for (const blob of this.blobs) {
            blobs.push(blob.toMsgpack());
        }

        let retval = {
            contentId : this.contentId,
            type : this.type,
            disposition : this.disposition,
            blobs : blobs,
        };

        if (this.content instanceof ArrayBuffer) {
            retval.content = new Uint8Array(this.content);
        }
        else {
            retval.content = this.content;
        }

        return retval;
    }

    validate() {
        if (this.content === undefined || this.content === null) {
            this.content = null;
        }
        else if (! (this.content instanceof ArrayBuffer)) {
            // Since the ctor accepts String, the message also mentions String
            throw new Error(
                    `Invalid text content '${this.content}'. Must be a String or an ArrayBuffer`);
        }

        if (! Array.isArray(this.blobs)) {
            throw new Error(`Invalid blobs value '${this.blobs}'. Must be an Array of Blobs`);
        }
        else {
            let i = 0;
            for (const blob of this.blobs) {
                if (blob instanceof Blob) {
                    blob.validate();
                }
                else if (blob instanceof ArrayBuffer) {
                    // fallthrough
                }
                else {
                    throw new Error(`Invalid blob value '${blob}' at index ${
                            i}. Must be a valid Blob instance`);
                }

                ++i;
            }
        }

        super.validate();
    }

    blobify() { throw new Error("not implemented"); }
}

export class MessageBodyHtml extends MessageBody {
    constructor({
        content = null,
        contentId = null,
        disposition = MessageBody.Inline,
        blobs = [],
        language = null,
        charset = null,
    } = {}) {
        super({
            content : content,
            contentId : contentId,
            type : "text/html",
            disposition : disposition,
            blobs : blobs,
            charset : charset,
        });
        this.language = language;
    }

    set content(v) {
        if (isString(v)) {
            v = soba.text.encode(v).buffer;
            this.charset = "UTF-8";
        }

        super.content = v;
    }

    toJSON() {
        let blobs = [];
        for (const blob of this.blobs) {
            blobs.push(blob.toJSON());
        }

        let retval = {
            content : this.content,
            contentId : this.contentId,
            type : this.type,
            disposition : this.disposition,
            blobs : blobs,
        };

        if (this.language) {
            retval.language = this.language;
        }

        return retval;
    }

    toMsgpack() {
        let blobs = [];
        for (const blob of this.blobs) {
            blobs.push(blob.toMsgpack());
        }

        let retval = {
            contentId : this.contentId,
            type : this.type,
            disposition : this.disposition,
            blobs : blobs,
        };

        if (this.content instanceof ArrayBuffer) {
            retval.content = new Uint8Array(this.content);
        }
        else {
            retval.content = this.content;
        }

        return retval;
    }

    validate() {
        if (this.content === undefined || this.content === null) {
            this.content = null;
        }
        else if (! (this.content instanceof ArrayBuffer)) {
            // A HTML document is just a blob of bytes, but since our ctor accepts String, the
            // message also mentions String
            throw new Error(
                    `Invalid text content '${this.content}'. Must be a String or an ArrayBuffer`);
        }

        // TODO: DRY this with MessageBodyText
        if (! Array.isArray(this.blobs)) {
            throw new Error(`Invalid blobs value '${this.blobs}'. Must be an Array of Blobs`);
        }
        else {
            let i = 0;
            for (const blob of this.blobs) {
                if (! (blob instanceof Blob)) {
                    throw new Error(`Invalid blob value '${JSON.stringify(blob)}' at index ${
                            i}. Must be a valid Blob instance`);
                }

                blob.validate();

                ++i;
            }
        }

        if (! (this.language === null || (isString(this.language) && this.language.length > 0))) {
            throw new Error(`Invalid language value '${
                    this.language}'. Must be null or a non-empty String`);
        }
    }

    blobify() { throw new Error("not implemented"); }
}

export class MessageBodyData extends MessageBody {
    constructor({
        content = null,
        contentId = null,
        type = null,
    } = {}) {
        super({content : content, contentId : contentId, type : type, disposition : "attachment"});
    }

    toJSON() {
        return {
            content : this.content,
            contentId : this.contentId,
            type : this.type,
            disposition : this.disposition,
        };
    }

    validate() {
        if (! (this.content instanceof Object || this.content instanceof Array)) {
            throw new Error(`Invalid data content '${this.content}'. Must be an Array or Object`);
        }

        if (! (this.type == "application/xml" || this.type == "application/json"
                    || this.type == "application/msgpack")) {
            throw new Error(`Invalid data type '${this.type}'.` +
                    ` Expected one of: ['application/xml', 'application/json', 'application/msgpack']`);
        }
    }

    blobify() { throw new Error("not implemented"); }
}

export class MessageAttachment {
    constructor({
        name = null,
        type = "application/octet-stream",
        blobs = [],
        contentId = null,
        origType = null,
    } = {}) {
        this.name = name;
        this.type = type;
        this.blobs = blobs;
        this.contentId = contentId;
        this.origType = origType;
    }

    toJSON() {
        let retval = {
            name : this.name,
            type : this.type,
            contentId : this.contentId,
            blobs : this.blobs.map(b => {
                if (b instanceof Blob) {
                    return b.toJSON()
                }

                return b;
            }),
        };

        if (this.origType) {
            retval.origType = this.origType;
        }

        return retval;
    }

    toMsgpack() {
        let retval = {
            name : this.name,
            type : this.type,
            contentId : this.contentId,
        };

        if (this.origType) {
            retval.origType = this.origType;
        }

        retval.blobs = this.blobs.map(blob => {
            if (blob instanceof ArrayBuffer) {
                return new Uint8Array(blob);
            }
            return blob.toMsgpack();
        });

        return retval;
    }

    isValid() {
        try {
            this.validate();
            return true;
        }
        catch (e) {
            return false;
        }
    }

    validate() { // for incoming messages
        if (! isString(this.name)) {
            throw new Error(`Invalid attachment name value '${this.name}'. Must be a String`);
        }

        if (! isString(this.type)) {
            throw new Error(`Invalid type value '${this.type}'. Must be a String`);
        }

        if (! Array.isArray(this.blobs)) {
            throw new Error(`Invalid blobs value '${this.blobs}'. Must be an Array of Blobs`);
        }

        for (let blob of this.blobs) {
            if (blob instanceof ArrayBuffer) {
                blob = new Blob({data : blob})
            }
            else if (! (blob instanceof Blob)) {
                blob = new Blob(blob);
            }

            blob.validate();
        }
    }

    // WARNING: to be integrated
    validateStrict() { // for outgoing messages
        validate();

        if (! (this.name.length > 0)) {
            throw new Error(
                    `Invalid attachment name value '${this.name}'. Must be a non-empty String`);
            // TODO: also ensure it's unique within the Message as well as has no dubious chars
            // like slashes
        }

        if (! (this.type.length > 0)) {
            throw new Error(
                    `Invalid attachment name value '${this.type}'. Must be a non-empty String`);
            // TODO: also validate as a mime type using regex
        }
    }
}

export class Message {
    static KEY = `{${namespace}}${this.name}`;

    static singleStringHeaders = [
        "in-reply-to",
        "subject",
    ];

    static singleAddressHeaders = [
        "return-path",
        "sender",
        "resent-sender",
        "disposition-notification-to",
    ];

    static singleAddressArrayHeaders = [
        "from",
        "to",
        "cc",
        "bcc",
        "reply-to",

        "resent-from",
        "resent-to",
        "resent-cc",
        "resent-bcc",
        "resent-reply-to",
    ];

    static singleStringArrayHeaders = [
        "references",
    ];

    #uuid = null;
    #headers;
    #attachments;
    #bodyText;
    #bodyHtml;
    #bodyData;
    #folderState = new Map();
    #cidCounter = 0;
    #cidSet = new Set();

    constructor({
        uuid = "{00000000-0000-0000-0000-000000000000}",
        headers = [],
        attachments = [],
        bodyText = null,
        bodyHtml = null,
        bodyData = null,
    } = {}) {
        this.#uuid = uuid;
        this.#headers = headers;
        this.#attachments = attachments;
        this.#bodyText = bodyText;
        this.#bodyHtml = bodyHtml;
        this.#bodyData = bodyData;
    }

    /* json serializer */
    toJSON() {
        let retval = {
            headers : this.#headers,
        };

        if (this.bodyText) {
            retval.bodyText = this.#bodyText;
        }

        if (this.bodyHtml) {
            retval.bodyHtml = this.#bodyHtml;
        }

        if (this.bodyData) {
            retval.bodyData = this.#bodyData;
        }

        if (this.attachments.length > 0) {
            retval.attachments = this.#attachments;
        }

        // local states are not serialized

        return retval;
    }

    toMsgpack() {
        let retval = {
            headers : this.#headers,
        };

        if (this.bodyText) {
            retval.bodyText = this.#bodyText.toMsgpack();
        }

        if (this.bodyHtml) {
            retval.bodyHtml = this.#bodyHtml.toMsgpack();
        }

        if (this.bodyData) {
            retval.bodyData = this.#bodyData;
        }

        if (this.attachments.length > 0) {
            retval.attachments = this.attachments.map(attachment => {
                if (attachment instanceof MessageAttachment) {
                    return attachment.toMsgpack();
                }
                else {
                    return this.#attachments;
                }
            });
        }

        // local states are not serialized

        return retval;
    }

    validateUuid() {
        const uuid = this.#uuid;
        const re = new RegExp(soba.type.uuid.pattern);
        if (! (isString(uuid) && uuid.length > 0 && re.test(uuid))) {
            throw new Error(`Invalid uuid '${uuid}'. Must be a valid uuid String`);
        }
    }

    /**
     * Validate headers of the email object.
     * @param {*Boolean} strict: Pass true to validate outbound messages, false
     *         otherwise.
     */
    validateHeaders(strict = false) {
        const headers = this.#headers;
        if (! Array.isArray(headers)) {
            throw new Error(`Invalid headers value: Must be an array`);
        }

        const reAddress = new RegExp(soba.type.address.pattern);

        for (const header of headers) {
            if (! Array.isArray(header)) {
                throw new Error(`Invalid header entry ${JSON.stringify(header)}: Must be an array`);
            }

            if (header.length < 2) {
                throw new Error(`Invalid header entry ${
                        JSON.stringify(header)}: Must be an array of size>=2`);
            }

            const name = header.at(0);
            if (! (isString(name) && name.length > 0)) {
                throw new Error(`Invalid header name in ${
                        JSON.stringify(header)}: Must be a non-empty String`);
            }

            // still log name because we assume toLowerCase is bug-free
            const nameLower = name.toLowerCase();

            // TODO: func these out
            if (Message.singleAddressHeaders.indexOf(nameLower) >= 0) {
                const value = header.at(1);
                soba.log.debug(JSON.stringify(value));

                // validate header value that hold name/address pairs
                if (! (value instanceof EmailAddress)) {
                    (new EmailAddress(value)).validate();
                }
                else {
                    value.validate();
                }

                if (strict) {
                    // in strict mode we also validate addresses against the
                    // address regex
                    if (! reAddress.test(value.address)) {
                        throw new Error(`Invalid address value ${
                                JSON.stringify(value)} in header for key "${name}": Must match ${
                                soba.type.address.pattern}`);
                    }
                }
            }
            else if (Message.singleAddressArrayHeaders.indexOf(nameLower) >= 0) {
                const values = header.at(1);
                soba.log.debug(JSON.stringify(values));

                if (! (Array.isArray(values) && values.length > 0)) {
                    throw new Error(`Invalid header value in ${
                            JSON.stringify(header)}: Must be a non-empty array`);
                }

                for (const [i, value] of values.entries()) {
                    // validate header values that hold name/address pairs
                    if (! (value instanceof EmailAddress)) {
                        (new EmailAddress(value)).validate();
                    }
                    else {
                        value.validate();
                    }

                    if (strict) {
                        // in strict mode we also validate addresses against the
                        // address regex
                        if (! reAddress.test(value.address)) {
                            throw new Error(`Invalid address value ${
                                    JSON.stringify(value)} at index ${i} in header for key "${
                                    name}": Must match ${soba.type.address.pattern}`);
                        }
                    }
                }
            }
            else if (Message.singleStringArrayHeaders.indexOf(nameLower) >= 0) {
                const values = header.at(1);
                soba.log.debug(JSON.stringify(values));

                if (! (Array.isArray(values) && values.length > 0)) {
                    throw new Error(`Invalid header value in ${
                            JSON.stringify(header)}: Must be a non-empty array`);
                }

                for (const [i, value] of values.entries()) {
                    if (! isString(value)) {
                        throw new Error(`Invalid header value ${JSON.stringify(value)} at index ${
                                i} in string header for key "${name}": Must be a String`);
                    }
                    // validate header values that hold name/address pairs
                }
            }
            else { // validate header values that hold arbitrary strings
                const value = header.at(1);
                if (! isString(value)) {
                    throw new Error(`Invalid header value ${
                            JSON.stringify(
                                    value)} in string header for key "${name}": Must be a String`);
                }
            }
        }
    }

    validate() {
        this.validateUuid();
        this.validateHeaders();
    }

    isValid() {
        try {
            this.validate();
            return true;
        }
        catch (e) {
            return false;
        }
    }

    /* Internal */
    nextContentId() { return (this.#cidCounter++) + ""; }

    /* Trivial getters */
    get uuid() { return this.#uuid; }
    get headers() { return this.#headers; }
    get attachments() { return this.#attachments; }
    get bodyText() { return this.#bodyText; }
    get bodyHtml() { return this.#bodyHtml; }
    get bodyData() { return this.#bodyData; }
    get folderState() { return this.#folderState; }

    /* Trivial setters */
    set headers(v) {
        this.#headers = v;
        this.validateHeaders();
    }

    set uuid(v) {
        this.#uuid = v;
        this.validateUuid();
    }

    /* Blob setters */
    set bodyText(v) {
        if (isString(v) || v instanceof ArrayBuffer) {
            v = new MessageBodyText({content : v, contentId : this.nextContentId()});
        }

        if (! (v instanceof MessageBodyText)) {
            v = new MessageBodyText(v);
        }

        v.validate(); // can throw

        if (this.#cidSet.has(v.contentId)) {
            throw new Error("Content-Id value must be unique within the Message instance");
        }

        this.#cidSet.add(v.contentId);
        this.#bodyText = v;
    }

    set bodyHtml(v) {
        if (isString(v) || v instanceof ArrayBuffer) {
            v = new MessageBodyHtml({content : v, contentId : this.nextContentId()});
        }
        else if (! (v instanceof MessageBodyHtml)) {
            v = new MessageBodyHtml(v);
        }

        v.validate(); // can throw

        if (this.#cidSet.has(v.contentId)) {
            throw new Error("Content-Id value must be unique within the Message instance");
        }

        this.#cidSet.add(v.contentId);
        this.#bodyHtml = v;
    }

    set bodyData(v) {
        if (! (v instanceof MessageBodyData)) {
            v = new MessageBodyData(v);
        }

        v.validate(); // can throw

        if (this.#cidSet.has(v.contentId)) {
            throw new Error("Content-Id value must be unique within the Message instance");
        }

        this.#cidSet.add(v.contentId);
        this.#bodyData = v;
    }

    set attachments(attachments) {
        if (! (attachments instanceof Array)) {
            throw new Error(`Invalid attachments value '${
                    JSON.stringify(
                            attachments)}'. Must be an Array of MessageAttachment instances`);
        }

        let attachmentsValid = [];
        for (let a of attachments) {
            if (! (a instanceof MessageAttachment)) {
                a = new MessageAttachment(a);
            }
            a.validate(); // can throw
            attachmentsValid.push(a);
        }

        this.#attachments = attachmentsValid;
    }

    /*
     * Header manipulators
     */

    /* headerValue: Singleton headers that typically contain a single value. Eg.
     * Sender, Subject */
    getHeaderValue(name) {
        if (! (isString(name) && name.length > 0)) {
            throw new Error(`Invalid header name '${name}'. Must be a non-empty String`);
        }

        name = name.toLowerCase();
        if (Message.singleAddressHeaders.indexOf(name) < 0
                && Message.singleStringHeaders.indexOf(name) < 0) {
            throw new Error(`Invalid header name '${name}'. Must be one of ${
                    Message.singleStringHeaders.concat(Message.singleAddressHeaders)}`);
        }

        for (const a of this.headers) {
            if (a.length == 0) {
                // this is invalid yet could be a valid intermediate state so we
                // don't throw
                continue;
            }
            if (a[0].length < 2) {
                throw new Error("Invalid header structure");
            }
            if (a[0].toLowerCase() == name) {
                return a[1];
            }
        }

        return null;
    }

    /* headerValue: Singleton headers that contain an array of values. Eg. To,
     * Cc */
    getHeaderSingleArray(name) {
        name = name.toLowerCase();
        if (Message.singleAddressArrayHeaders.indexOf(name) < 0) {
            throw new Error(`Invalid header name '${name}'. Must be one of ${
                    Message.singleAddressArrayHeaders}`);
        }

        for (const a of this.headers) {
            if (a.length == 0) {
                // this is invalid yet could be a valid intermediate state so we
                // don't throw
                continue;
            }
            if (a[0].length < 2) {
                throw new Error("Invalid header structure");
            }
            if (a[0].toLowerCase() == name) {
                return a[1];
            }
        }

        return null;
    }

    setHeaderSingleString(name, value) {
        if (! (isString(name) && name.length > 0)) {
            throw new Error(`Invalid name value '${name}'. Must be a non-empty String`);
        }

        let i = 0;

        const nameLower = name.toLowerCase();
        if (Message.singleStringHeaders.indexOf(nameLower) < 0) {
            throw new Error(`Invalid header name '${nameLower}'. Must be one of ${
                    Message.singleStringHeaders}`);
        }

        for (const a of this.headers) {
            if (a.length == 0) {
                // this is invalid yet could be a valid intermediate state so we
                // don't throw
                continue;
            }
            if (a[0].length < 2) {
                throw new Error("Invalid header structure");
            }
            if (a[0].toLowerCase() == nameLower) {
                a[1] = [ value ];
                return i;
            }

            ++i;
        }

        this.headers.push([ name, value ]);

        return i;
    }

    setHeaderSingleAddress(name, ea) {
        if (! (isString(name) && name.length > 0)) {
            throw new Error(`Invalid name value '${name}'. Must be a non-empty String`);
        }

        if (! (ea instanceof EmailAddress)) {
            ea = new EmailAddress(ea);
        }

        ea.validate(); // can throw

        let i = 0;

        const nameLower = name.toLowerCase();
        for (const a of this.headers) {
            if (a.length == 0) {
                // this is invalid yet could be a valid intermediate state so we
                // don't throw
                continue;
            }
            if (a[0].length < 2) {
                throw new Error("Invalid header structure");
            }
            if (a[0].toLowerCase() == nameLower) {
                a[1] = ea;
                return i;
            }

            ++i;
        }

        this.headers.push([ name, ea ]);

        return i;
    }

    setHeaderSingleAddressArray(name, emailAddresses) {
        const nameLower = name.toLowerCase();
        if (Message.singleAddressArrayHeaders.indexOf(nameLower) < 0) {
            throw new Error(`Invalid header name '${nameLower}'. Must be one of ${
                    Message.singleAddressArrayHeaders}`);
        }

        if (! (emailAddresses instanceof Array)) {
            throw new Error(`Invalid emailAddresses value '${
                    emailAddresses}'. Must be an Array of EmailAddress instances`);
        }

        let emailAddressMap = new Map();
        let emailAddressesValid = [];

        let j = 0;

        for (let ea of emailAddresses) {
            if (! (ea instanceof EmailAddress)) {
                ea = new EmailAddress(ea);
            }

            ea.validate(); // can throw

            let index = emailAddressMap.get(ea.address)
            if (index || index === 0) {
                emailAddressesValid[index].name = ea.name;
            }
            else {
                emailAddressesValid.push(ea);
                emailAddressMap.set(ea.address, j);
            }

            ++j;
        }

        let i = 0;

        for (const a of this.headers) {
            if (a.length == 0) {
                // this is invalid yet could be a valid intermediate state so we
                // don't throw
                continue;
            }
            if (a[0].length < 2) {
                throw new Error("Invalid header structure");
            }
            if (a[0].toLowerCase() == nameLower) {
                a[1] = emailAddressesValid;
                return i;
            }

            ++i;
        }

        this.headers.push([ name, emailAddressesValid ]);

        return i;
    }

    addToSingleAddressArray(name, emailAddresses) {
        const nameLower = name.toLowerCase();
        if (Message.singleAddressArrayHeaders.indexOf(nameLower) < 0) {
            throw new Error(`Invalid header name '${nameLower}'. Must be one of ${
                    Message.singleAddressArrayHeaders}`);
        }

        if (! (emailAddresses instanceof Array)) {
            throw new Error(`Invalid emailAddresses value '${
                    emailAddresses}'. Must be an Array of EmailAddress instances`);
        }

        let emailAddressArray = null;
        let emailAddressMap = new Map();

        let i = 0;

        for (const a of this.headers) {
            if (a.length == 0) {
                // this is invalid yet could be a valid intermediate state so we
                // don't throw
                continue;
            }
            if (a[0].length < 2) {
                throw new Error("Invalid header structure");
            }
            if (a[0].toLowerCase() == nameLower) {
                emailAddressArray = a[1];
                soba.log.info(`${a[0]} Before ${JSON.stringify(emailAddressArray)}`);

                let j = 0;

                for (const ea of emailAddressArray) {
                    emailAddressMap.set(ea.address, j++);
                }

                break;
            }

            ++i;
        }

        if (i == this.headers.length) {
            this.headers.push([ name, emailAddresses ]);
            return i;
        }

        for (let ea of emailAddresses) {
            if (! (ea instanceof EmailAddress)) {
                ea = new EmailAddress(ea);
            }

            ea.validate(); // can throw

            let index = emailAddressMap.get(ea.address);
            if (index || index === 0) {
                emailAddressArray[index].name = ea.name;
            }
            else {
                emailAddressArray.push(ea);
            }
        }

        soba.log.info(`${name} After  ${JSON.stringify(emailAddressArray)}`);

        return i;
    }

    /* Sender: EmailAddress */
    get hasSender() { return this.getHeaderValue("Sender") !== null; }
    get sender() {
        const a = this.getHeaderValue("Sender");
        if (! a) {
            return null;
        }
        return a;
    }

    set sender(emailAddress) { this.setHeaderSingleAddress("Sender", emailAddress); }

    /* From: EmailAddress[] */
    get hasFrom() { return this.getHeaderValue("From") !== null; }

    get from() {
        const a = this.getHeaderSingleArray("From");
        if (! a) {
            return new EmailAddress();
        }
        return a;
    }

    get fromName() {
        const a = this.getHeaderSingleArray("From");
        if (! a) {
            return null;
        }
        if (a.length == 0) {
            return null;
        }
        if (a[0].length == 0) {
            return null;
        }
        return a[0].name;
    }

    get fromAddress() {
        const a = this.getHeaderSingleArray("From");
        if (! a) {
            return null;
        }
        if (a.length == 0) {
            return null;
        }
        if (a[0].length == 0) {
            throw new Error("Invalid header structure for key 'From'");
        }
        return a[0].address;
    }

    set from(emailAddress) { this.setHeaderSingleAddressArray("From", emailAddress); }

    /* To: EmailAddress[] */
    get hasTo() { return this.getHeaderValue("To") !== null; }

    get to() {
        const a = this.getHeaderSingleArray("To");
        if (! a) {
            return null;
        }
        return a;
    }

    set to(emailAddresses) { this.setHeaderSingleAddressArray("To", emailAddresses); }
    addTo(emailAddresses) { this.addToSingleAddressArray("To", emailAddresses); }

    /* Cc: EmailAddress[] */
    get hasCc() { return this.getHeaderValue("Cc") !== null; }

    get cc() {
        const a = this.getHeaderSingleArray("Cc");
        if (! a) {
            return null;
        }
        return a;
    }

    set cc(emailAddresses) { this.setHeaderSingleAddressArray("Cc", emailAddresses); }
    addCc(emailAddresses) { this.addToSingleAddressArray("Cc", emailAddresses); }

    /* Bcc: EmailAddress[] */
    get hasBcc() { return this.getHeaderValue("Bcc") !== null; }

    get bcc() {
        const a = this.getHeaderSingleArray("Bcc");
        if (! a) {
            return null;
        }
        return a;
    }

    set bcc(emailAddresses) { this.setHeaderSingleAddressArray("Bcc", emailAddresses); }
    addBcc(emailAddresses) { this.addToSingleAddressArray("Bcc", emailAddresses); }

    /* Subject: String */
    get hasSubject() { return this.getHeaderValue("Subject") !== null; }

    get subject() {
        const a = this.getHeaderValue("Subject");
        if (! a) {
            return null;
        }
        return a;
    }

    set subject(subject) { this.setHeaderSingleString("Subject", subject); }

    /* Message-Id: String */
    get hasMessageId() { return this.getHeaderValue("Message-Id") !== null; }

    get messageId() {
        const a = this.getHeaderValue("Message-Id");
        if (! a) {
            return null;
        }
        return a;
    }

    /* uuid: String */
    genUuid() { return this.#uuid = soba.type.uuid.v4(); }

    /*
     * Local State Manipulators
     */

    getFolderState(folder) {
        if (! this.#folderState.has(folder)) {
            return null;
        }

        return this.#folderState.get(folder);
    }

    addFolder(folder, state) {
        if (! state) {
            state = new MessageAttributes();
        }
        else if (! (state instanceof MessageAttributes)) {
            state = new MessageAttributes(state);
        }

        if (! this.#folderState.has(folder)) {
            return this.#folderState.set(folder, new MessageFolderState(state));
        }

        return this.#folderState.get(folder);
    }

    setFolder(folder, state) {
        this.#folderState = new Map();
        this.addFolder(folder, state);
    }
}

export function runTestSuite() {
    /* TODO: :/ */
    return true;
}
