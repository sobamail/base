
export const namespace = "https://sobamail.com/module/usermanager/v1"

import "soba://computer/R1"

export class AddDomain {
    static KEY = `{${namespace}}${this.name}`;

    constructor({domain = null}) { this.domain = instanceId; }

    asText(locale) { return `Add domain "${this.instanceId}"`; }

    toString() { return `AddDomain("${this.instanceId}")`; }
}

export class AddUser {
    static KEY = `{${namespace}}${this.name}`;

    constructor({email = null}) { this.email = email; }

    asText(locale) { return `Add user ${this.email}`; }

    toString() { return `AddUser("${this.email}")`; }
}
