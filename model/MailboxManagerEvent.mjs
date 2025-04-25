
export const namespace = "https://sobamail.com/module/mailboxmanager/v1"

import "soba://computer/R1"

export class InitializeFolders {
    static KEY = `{${namespace}}${this.name}`;

    constructor({schema = null}) { this.schema = schema; }

    asText(locale) {
        return `Let MailboxManager know about local folders with schema version: ${
                this.instanceId}`;
    }

    toString() { return `InitializeFolders("${this.schema}")`; }
}

export class InitializeMessages {
    static KEY = `{${namespace}}${this.name}`;

    constructor({schema = null}) { this.schema = schema; }

    asText(locale) {
        return `Let MailboxManager know about local messages with schema version: ${
                this.instanceId}`;
    }

    toString() { return `InitializeMessages("${this.schema}")`; }
}

export class SetAttr {
    static KEY = `{${namespace}}${this.name}`;

    constructor({key = null, value = null}) {
        this.key = key;
        this.value = value;
    }

    asText(locale) { return `Set ${this.key}=${this.value}`; }

    toString() { return `SetAttr("${this.key}", "${this.value}")`; }
}

export class UnsetAttr {
    static KEY = `{${namespace}}${this.name}`;

    constructor({key = null}) { this.key = key; }

    asText(locale) { return `Unset ${this.key}`; }

    toString() { return `UnsetAttr("${key}")`; }
}

export class CreateFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, name = null}) {
        this.uuid = uuid;
        this.name = name;
    }

    asText(locale) { return `Create folder uuid '${this.uuid}' name '${this.name}'`; }

    toString() { return `CreateFolder("${this.uuid}", "${this.name}")`; }
}

export class InsertFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, mirror = false}) {
        this.uuid = uuid;
        this.mirror = mirror;
    }

    asText(locale) { return `Insert folder uuid '${this.uuid}' name '${this.name}'`; }

    toString() { return `InsertFolder("${this.uuid}", "${this.name}")`; }
}

export class DeleteFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, mirror = false}) {
        this.uuid = uuid;
        this.mirror = mirror;
    }

    asText(locale) { return `Delete folder '${this.uuid}'`; }

    toString() { return `DeleteFolder("${this.uuid}")`; }
}

export class SetAttrFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, key = null, value = null, mirror = false}) {
        this.uuid = uuid;
        this.key = key;
        this.value = value;
        this.mirror = mirror;
    }

    asText(locale) {
        return `Set state for folder ${this.uuid} key '${this.key}' value '${this.value}'`;
    }

    toString() { return `SetAttrFolder(${this.uuid}, '${this.key}', '${this.value}')`; }
}

export class UnsetAttrFolder {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, key = null, mirror = false}) {
        this.uuid = folder;
        this.key = key;
        this.mirror = mirror;
    }

    asText(locale) { return `Unset state for folder ${this.uuid} key '${this.key}'`; }

    toString() { return `UnsetAttrFolder(${this.uuid}, ${this.key})`; }
}

export class AddMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.mirror = mirror;
    }

    asText(locale) { return `Add message ${this.message} to folder '${this.folder}'`; }

    toString() { return `AddMessage("${this.folder}", "${this.message}")`; }
}

export class RemoveMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.mirror = mirror;
    }

    asText(locale) { return `Remove message ${this.message} from folder '${this.folder}'`; }

    toString() { return `RemoveMessage("${this.folder}", "${this.message}")`; }
}

export class SetAttrMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, key = null, value = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.key = key;
        this.value = value;
        this.mirror = false;
    }

    asText(locale) {
        return `Set state in folder ${this.folder} for message ${this.message} key '${
                this.key}' value '${this.value}'`;
    }

    toString() {
        return `SetAttrMessage(${this.folder}, ${this.message}, ${this.key}, ${this.value})`;
    }
}

export class UnsetAttrMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({folder = null, message = null, key = null, mirror = false}) {
        this.folder = folder;
        this.message = message;
        this.key = key;
        this.mirror = false;
    }

    asText(locale) {
        return `Unset state in folder ${this.folder} for message ${this.message} key '${this.key}'`;
    }

    toString() { return `UnsetAttrMessage(${this.folder}, ${this.message}, ${this.key})`; }
}

export class GrantAccess {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null, address = null}) {
        this.message = message;
        this.address = address;
    }

    asText(locale) { return `Grant access to message ${this.message} to address ${this.address}`; }

    toString() { return `GrantAccess("${this.message}", "${this.address}")`; }
}

export class RevokeAccess {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null, address = null}) {
        this.message = message;
        this.address = address;
    }

    asText(locale) {
        return `Revoke access of address ${this.address} to message ${this.message} `;
    }

    toString() { return `RevokeAccess("${this.message}", "${this.address}")`; }
}

export class DeliverMessage {
    static KEY = `{${namespace}}${this.name}`;

    constructor({message = null}) {
        this.message = message;
        this.address = address;
    }

    asText(locale) { return `Deliver message ${this.message} to address ${this.address}`; }

    toString() { return `DeliverMessage("${this.message}", "${this.address}")`; }
}

export class GetRules {
    static KEY = `{${namespace}}${this.name}`;

    constructor({}) {}

    asText(locale) { return `Get delivery rules`; }

    toString() { return `GetRules()`; }
}

export class AddRule {
    static KEY = `{${namespace}}${this.name}`;

    constructor({uuid = null, label = null}) {
        this.uuid = uuid;
        this.label = label;
    }

    asText(locale) { return `Put delivery rule`; }

    toString() { return `GetRules()`; }
}

export class AddHeaderCondition {
    static KEY = `{${namespace}}${this.name}`;

    constructor({rule = null, key = null, op = null, value = null}) {
        this.rule = rule;
        this.key = key;
        this.op = op;
        this.value = value;
    }

    asText(locale) { return `Rule ${this.rule} Header ${this.key} ${this.op} ${this.value}`; }

    toString() {
        return `AddHeaderCondition(${this.rule}, ${this.key}, ${this.op}, ${this.value})`;
    }
}

export class AddBodyCondition {
    static KEY = `{${namespace}}${this.name}`;

    constructor({rule = null, op = null, value = null}) {
        this.rule = rule;
        this.op = op;
        this.value = value;
    }

    asText(locale) { return `Rule ${this.rule} Body ${this.op} ${this.value}`; }

    toString() { return `AddBodyCondition(${this.op}, ${this.value})`; }
}

export class AddFileIntoAction {
    static KEY = `{${namespace}}${this.name}`;

    constructor({rule = null, target = null}) {
        this.rule = rule;
        this.target = target;
    }

    asText(locale) { return `Rule ${this.uuid} Action: fileinto ${this.target}`; }

    toString() { return `AddFileIntoAction(${this.uuid}, ${this.target})`; }
}

export class DeliveryEvent {
    static KEY = `{${namespace}}${this.name}`;

    constructor({
        server = null,
        utctimeMs = null,
        message = null,
        destaddr = null,
        statuscode = null,
        statustext = null,
        statusdata = null,
    }) {
        this.server = server;
        this.utctimeMs = utctimeMs;
        this.message = message;
        this.destaddr = destaddr;
        this.statuscode = statuscode;
        this.statustext = statustext;
        this.statusdata = statusdata;
    }

    asText(locale) { return `Delivery event ${this.message} to address ${this.address}`; }

    toString() {
        return `DeliveryEvent("${this.server}, ${this.utctimeMs}, ${this.message},` +
                ` ${this.destaddr}, ${this.statuscode}, ${this.statustext}, ${this.statusdata}, ")`;
    }
}

// Internal object not to be produced by user code
export class MessageTask {
    static KEY = `{${namespace}}${this.name}`;
};
