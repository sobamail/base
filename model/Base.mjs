
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

        soba.log.debug(message);

        super(message, cause);
    }
}

export class BlobDataReadError extends Error {
    constructor(blobId, errCode, errText) {
        const message = `Blob data could not be read`;
        const cause = {blobId : blobId, errCode : errCode, errText : errText};

        soba.log.debug(message);

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

    toJSON() { return {key : this.key, offset : this.offset}; }
}

export class BlobTransformLength extends BlobTransform {
    static KEY = 1;

    constructor(length) {
        super(BlobTransformLength.KEY);

        if (! Number.isInteger(length)) {
            throw new Error(`Invalid digest key '${length}'. Expected: A positive integer`);
        }
        this.length = length;
    }

    toJSON() { return {key : this.key, length : this.length}; }
}

export class BlobTransformEncoding extends BlobTransform {
    static KEY = 2;

    static Identity = 0;
    static Base64 = 1;

    constructor(encoding) {
        super(BlobTransformEncoding.KEY);

        BlobTransformEncoding
        if (! (encoding === 1 || encoding === 2)) {
            throw new Error(`Invalid encoding value '${
                    encoding}'. Must be one of [BlobTransformEncoding.Identity, BlobTransformEncoding.Base64]`);
        }

        this.encoding = encoding;
    }

    toJSON() { return {key : this.key, encoding : this.encoding}; }
}

class BlobTransformNewlineBase extends BlobTransform {
    constructor(key, numBytes, numTimes) {
        super(key);

        this.numBytes = numBytes;
        this.numTimes = numTimes;

        if (! Number.isInteger(numBytes)) {
            throw new Error(`Invalid new line frequency '${
                    numBytes}'. Expected: A strictly positive integer`);
        }

        if (numBytes < 1) {
            throw new Error(`Invalid new line frequency '${
                    numBytes}'. Expected: A strictly positive integer`);
        }

        if (! Number.isInteger(numTimes)) {
            throw new Error(
                    `Invalid new line count '${numTimes}'. Expected: A strictly positive integer`);
        }

        if (numTimes < 1) {
            throw new Error(
                    `Invalid new line c '${numTimes}'. Expected: A strictly positive integer`);
        }
    }

    toJSON() { return {key : this.key, numBytes : this.numBytes, numTimes : this.numTimes}; }
}

export class BlobTransformNewlineN extends BlobTransformNewlineBase {
    static KEY = 3
    constructor(numBytes, numTimes) { super(BlobTransformNewlineN.KEY, numBytes, numTimes); }
}

export class BlobTransformNewlineRN extends BlobTransformNewlineBase {
    static KEY = 5
    constructor(numBytes, numTimes) { super(BlobTransformNewlineRN.KEY, numBytes, numTimes); }
}

export class Blob {
    static MAX_SIZE = 1 << 30;

    static Sha1 = 1;
    static Sha224 = 2;
    static Sha256 = 3;
    static Sha512 = 4;
    static Sha384 = 5;

    constructor(
            {blobId = "", sizes = new Map(), digests = new Map(), data = null, transforms = null} =
                    {}) {
        this.blobId = blobId;
        this.sizes = sizes;
        this.digests = digests;
        this.data = data;
        this.transforms = transforms;
    }

    toJSON() {
        let retval = {
            blobId : this.blobId,
            sizes : Object.fromEntries(this.sizes),
            digests : Object.fromEntries( //
                    Object.entries(Object.fromEntries(this.digests)).map((e) => { //
                        return [ e[0], Object.fromEntries(e[1]) ];
                    })),
            transforms : this.transforms,
        };

        if (this.data) {
            retval.data = this.data;
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

    validate() {
        for (let a of Object.entries(this.sizes)) {
            a[0] = parseInt(a[0]);
            a[1] = parseInt(a[1]);
            if (! Number.isInteger(a[0])) {
                throw new Error(`Invalid size key '${a[0]}'. Expected: A positive integer`);
            }

            if (! Number.isInteger(a[1])) {
                throw new Error(`Invalid size value '${a[1]}'. Expected: A positive integer`);
            }

            if (a[0] < 0) {
                throw new Error(`Invalid size key '${a[0]}'. Expected: A positive integer`);
            }

            if (a[1] < 1) {
                throw new Error(
                        `Invalid size value '${a[1]}'. Expected: A strictly positive integer`);
            }

            if (a[1] > Blob.MAX_SIZE) {
                throw new Error(`Invalid size value '${a[1]}'. Blob.MAX_SIZE=${Blob.MAX_SIZE}`);
            }
        }

        for (let [c, digests] of Object.entries(this.digests)) {
            c = parseInt(c);

            if (! Number.isInteger(c)) {
                throw new Error(`Invalid compression key '${c}'. Expected: A positive integer`);
            }

            for (let [d, digest] of Object.entries(digests)) {
                d = parseInt(d);
                if (! Number.isInteger(d)) {
                    throw new Error(`Invalid digest key '${d}'. Expected: A positive integer`);
                }

                if (! (digest instanceof ArrayBuffer)) {
                    throw new Error(
                            `Invalid digest value '${a[0]}'. Expected: A non-empty ArrayBuffer`);
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

        if (! (this.data === null
                    || (this.data instanceof ArrayBuffer && this.data.byteLength > 0))) {
            throw new Error(
                    `Invalid data value '${data}'. Expected: null or a non-empty ArrayBuffer`);
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
            throw new Error(`Invalid name value '${this.name}' type ${
                    this.name.constructor.name}. Must be a String`);
        }

        if (! (isString(this.address) && this.address.length > 0)) {
            throw new Error(`Invalid address value '${this.address}'. Must be a non-empty String`);
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

    constructor({
        content = null,
        contentId = null,
        type = "application/octet-stream",
        disposition = MessageBody.Inline,
        blobs = [],
    } = {}) {
        this.content = content;
        this.contentId = contentId;
        this.type = type;
        this.disposition = disposition;
        this.blobs = blobs;
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

            // TODO: validate blobs
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
    } = {}) {
        super({
            content : content,
            contentId : contentId,
            type : "text/plain",
            disposition : disposition,
            blobs : blobs,
        });
        this.charset = "utf-8";
        this.language = language;
    }

    set content(v) {
        if (isString(v)) {
            v = soba.text.encode(v).buffer;
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

        if (! (this.charset === "utf-8")) {
            throw new Error(`Invalid charset value '${this.charset}'. Must be 'utf-8'`);
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
    } = {}) {
        super({
            content : content,
            contentId : contentId,
            type : "text/html",
            disposition : disposition,
            blobs : blobs
        });
        this.language = language;
    }

    set content(v) {
        if (isString(v)) {
            v = soba.text.encode(v).buffer;
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
            // Since the ctor accepts String, the message also mentions String
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
                    throw new Error(`Invalid blob value '${blob}' at index ${
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
            throw new Error(`Invalid data content '${this.content}'. Expected: An Array or Object`);
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
            if (! (blob instanceof Blob)) {
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
    static singletonAddressHeaders = [ "To", "Cc", "Bcc" ];

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
        uuid = null,
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
     * @param {*Boolean} strict: Pass true to validate outbound messages, false otherwise.
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

            const values = header.at(1);
            if (! (Array.isArray(values) && values.length > 0)) {
                throw new Error(`Invalid header value in ${
                        JSON.stringify(header)}: Must be a non-empty array`);
            }

            // TODO: func this out
            for (const [i, value] of values.entries()) {
                // validate header values that hold name/address pairs
                if (name === "From" //
                        || name === "To" //
                        || name === "Cc" //
                        || name === "Bcc" //
                        || name === "Return-Path" //
                        || name === "Reply-To" //
                        || name === "Sender") {
                    if (! (Array.isArray(value) && value.length >= 2)) {
                        throw new Error(`Invalid address header value for key "${
                                name}": Must be an array of size>=2`);
                    }

                    const addrName = value.at(0);
                    if (! isString(addrName)) {
                        throw new Error(`Invalid name in address header for key "${
                                name}": Must be a String`);
                    }

                    const addrValue = value.at(1);
                    if (! (isString(addrValue) && addrValue.length > 0)) {
                        throw new Error(`Invalid address in address header for key "${
                                name}": Must be a non-empty String`);
                    }

                    if (strict && (! reAddress.test(addrValue))) {
                        throw new Error(`Invalid address in address header for key "${
                                name}": Must match the pattern ${soba.type.address.pattern}`);
                    }
                }
                else { // validate header values that hold arbitrary strings
                    if (! isString(value)) {
                        throw new Error(`Invalid header value ${JSON.stringify(value)} at index ${
                                i} in string header for key "${name}": Must be a String`);
                    }
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

        if (! (v instanceof MessageBodyHtml)) {
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
        for (const a of attachments) {
            if (! (a instanceof MessageAttachment)) {
                a = new MessageAttachment(a);
                soba.log.debug("new att");
            }
            a.validate(); // can throw
            soba.log.debug("valid att");
            attachmentsValid.push(a);
            soba.log.debug("push");
        }

        this.#attachments = attachmentsValid;
    }

    /*
     * Header manipulators
     */

    /* headerValue: Singleton headers that contain a single value. Eg. From */
    getHeaderValue(name) {
        if (! (isString(name) && name.length > 0)) {
            throw new Error(`Invalid header name '${name}'. Must be a non-empty String`);
        }

        for (const a of this.headers) {
            if (a[0] == name) {
                return a[1];
            }
        }

        return null;
    }

    setHeaderAddressValue(name, ea) {
        if (! (ea instanceof EmailAddress)) {
            ea = new EmailAddress(ea);
        }

        ea.validate(); // can throw

        let i = 0;

        for (const a of this.headers) {
            if (a[0] == name) {
                a[1] = ea;
                return i;
            }
            ++i;
        }

        this.headers.push([ name, ea ]);

        return i;
    }

    /* headerValue: Singleton headers that contain an array of values. Eg. To */
    getHeaderSingleArray(name) {
        if (Message.singletonAddressHeaders.indexOf(name) < 0) {
            throw new Error(`Invalid header name '${name}'. Must be one of ${
                    Message.singletonAddressHeaders}`);
        }

        for (const a of this.headers) {
            if (a[0] == name) {
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

        for (const a of this.headers) {
            if (a[0] == name) {
                a[1] = value;
                return i;
            }

            ++i;
        }

        // assert(i == this.headers.length)
        this.headers.push([ name, value ]);

        return i;
    }

    setHeaderSingleAddressArray(name, emailAddresses) {
        if (Message.singletonAddressHeaders.indexOf(name) < 0) {
            throw new Error(`Invalid header name '${name}'. Must be one of ${
                    Message.singletonAddressHeaders}`);
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
            if (a[0] == name) {
                a[1] = emailAddressesValid;
                return i;
            }

            ++i;
        }

        this.headers.push([ name, emailAddressesValid ]);

        return i;
    }

    addToSingleAddressArray(name, emailAddresses) {
        if (Message.singletonAddressHeaders.indexOf(name) < 0) {
            throw new Error(`Invalid header name '${name}'. Must be one of ${
                    Message.singletonAddressHeaders}`);
        }

        if (! (emailAddresses instanceof Array)) {
            throw new Error(`Invalid emailAddresses value '${
                    emailAddresses}'. Must be an Array of EmailAddress instances`);
        }

        let emailAddressArray = null;
        let emailAddressMap = new Map();

        let i = 0;

        for (const a of this.headers) {
            if (a[0] == name) {
                emailAddressArray = a[1];

                let j = 0;

                for (const ea of emailAddressArray) {
                    emailAddressMap.set(ea.address, j++);
                }

                break;
            }

            ++i;
        }

        if (i == this.headers.length) {
            this.headers.push([ name, [ ea ] ]);
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
                // assert(emailAddressArray[index].address === ea.address);
            }
            else {
                emailAddressArray.push(ea);
            }
        }

        return i;
    }

    /* From: EmailAddress */
    get hasFrom() { return this.getHeaderValue("From") !== null; }

    get from() {
        const a = this.getHeaderValue("From");
        if (! a) {
            return new EmailAddress();
        }
        return a;
    }

    get fromName() {
        const a = this.getHeaderValue("From");
        if (! a) {
            return null;
        }
        return a.name;
    }

    get fromAddress() {
        const a = this.getHeaderValue("From");
        if (! a) {
            return null;
        }
        return a.address;
    }

    set from(emailAddress) { this.setHeaderAddressValue("From", emailAddress); }

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
