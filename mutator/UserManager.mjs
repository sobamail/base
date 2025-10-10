
import "soba://computer/R1"

import {
    DeleteRow,
    NotFoundError,
} from "https://sobamail.com/module/base/v1?sha224=LbrFSXuQxm2gn4-FaglNXRQbcv7kAz9Zew-p1A";
import {
    AddDomain,
    AddUser,
} from "https://sobamail.com/module/usermanager/v1?sha224=5D4Hw_mQ32DNO2JqRWkjN6tgZBwrURWV543d1g";

export default class UserManager {
    static id = "usermanager.app.sobamail.com";
    static name = "UserManager";
    static version = soba.info.version();
    static releaseChannel = soba.info.releaseChannel();
    static objects = [
        AddDomain.KEY,
        AddUser.KEY,
    ];

    constructor() {
        soba.schema.table({
            name : "domains",
            insertEvent : AddDomain,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "uuid",
                    checks : [
                        {op : "!=", value : null},
                        {op : "unique", value : true},
                        {op : "typeof", value : "text"},
                        {
                            op : "regexp",
                            value : "^\\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\}$"
                        },
                    ]
                },
                {
                    name : "name",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {
                            op : "regexp",
                            value : "(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:[a-z0-9][a-z0-9-]*[a-z0-9]):[^/%\\:]+(/[^/%\\:]+)*"
                        },
                    ]
                },
            ]
        });

        soba.schema.table({
            name : "users",
            insertEvent : AddUser,
            deleteEvent : DeleteRow,
            columns : [
                {
                    name : "domain",
                    checks : [
                        {op : "fk", table : "domains", column : "uuid"},
                        {op : "!=", value : null},
                    ]
                },
                {
                    name : "uuid",
                    checks : [
                        {op : "!=", value : null},
                        {op : "unique", value : true},
                        {op : "typeof", value : "text"},
                        {
                            op : "regexp",
                            value : "^\\{[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\\}$"
                        },
                    ]
                },
                {
                    name : "email",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {
                            op : "regexp",
                            value : "[a-z0-9]+(?:[._]?[a-z0-9]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+(?:[a-z0-9][a-z0-9-]*[a-z0-9]):[^/%\\:]+(/[^/%\\:]+)*"
                        },
                    ]
                },
                {
                    name : "password",
                    checks : [
                        {op : "!=", value : null},
                        {op : "typeof", value : "text"},
                        {
                            op : "regexp",
                            value : "\\{[A-Z0-9]+\\}(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?"
                        },
                    ]
                },
            ]
        });
    }

    process(message, meta) {
        soba.log.debug("meta: " + JSON.stringify(meta) + " mesg: " + JSON.stringify(message));

        if (meta.type == "task" || meta.type == "task-replay") {
            // a task only has the content, so it's safe to just pass it to the
            // dispatch function
            this.on_structured(message);
        }
        else if (meta.type == "message" && message.dataBody !== undefined) {
            // Here it's a structured email so we need to do some digging
            // to get to the content object
            let content = soba.mail.readContent(message, message.dataBody.cid);
            if (content === undefined) {
                throw new Error(`Unable to read message content`);
            }

            soba.log.debug("Content Type: " + (typeof content));

            if (content instanceof ArrayBuffer) {
                // This means the data content was read but was not parsed correctly.
                // So we treat it as a regular email.
                this.on_email(message);
            }
            else {
                // This means the message was deserialized successfully
                soba.log.debug("Message structure: " + JSON.stringify(content));

                // If it was a signed and/or encrypted message, it will be wrapped
                // in an Envelope object, so let's dig further if that's the case.
                if (content.name == "Envelope"
                        && content.namespace == "https://sobamail.com/module/base/v1") {
                    let envelope = content.content;
                    if (envelope === undefined) {
                        throw new Error(`Envelope is empty`);
                    }

                    soba.log.debug(
                            `Envelope format: ${envelope.format}, sender: ${envelope.sender}`);

                    content = envelope.content;
                }

                // Finally we have the content, let's process it
                this.on_structured(content);
            }
        }
        else {
            soba.log.warning(`Message ${message.uuid} is ignored`);
        }
    }

    on_structured(message) {
        if (message.namespace === undefined) {
            throw new Error("Message has no namespace");
        }

        if (message.name === undefined) {
            throw new Error("Message has no name");
        }

        const key = `{${message.namespace}}${message.name}`;
        if (key == AddDomain.KEY) {
            return this.on_add_domain(message.content);
        }

        if (key == AddUser.KEY) {
            return this.on_add_user(message.content);
        }

        throw new Error("No handler found for object " + key);
    }

    on_add_domain(content) {
        soba.log.info(`Processing AddDomain event`);

        const uuid = soba.type.uuid.generate();
        return soba.data.insert("domains", null, {uuid : uuid, name : content.name});
    }

    on_add_user(content) {
        soba.log.info(`Processing AddUser event`);

        if (content.uuid !== null) {
            try {
                return soba.data.find("users", {content.uuid});
            }
            catch (e) {
                if (e instanceof NotFoundError) {
                    // do nothing
                }
                else {
                    throw e;
                }
            }
        }

        const fragments = email.split("@");
        if (fragments.length != 2) {
            throw new Error(`Invalid email ${content.email}`)
        }

        const domain = fragments[1];
        const parent = soba.data.find("domains", {name : domain});
        return soba.data.insert(
                "users", {uuid : uuid, email : content.email, password : content.password});
    }
}
