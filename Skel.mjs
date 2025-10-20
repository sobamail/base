
/*
 * Did you initialize a git repository for this app? If not,
 * open a terminal in this directory and run:

        git init -b main
        git add Mutator.mjs
        git commit -m "Initial revision"

 * ... before making any modifications to this file.
 *
 * In case you are hosting on Github, the following might
 * come in handy:

        git remote add origin git@github.com:<user>/<project>
        git push --set-upstream origin main

 * Have fun!
 */

import "soba://computer/R1";

import {
    DeleteRow,
} from "https://sobamail.com/module/base/v1?sha224=K_9PaFg9J1szbWZecg-fSxloxwGL3VyWSTg9kQ";

export default class Mutator {
    static id = "test.user.app.sobamail.com";
    static name = "Skeleton Application";
    static version = "0.0.1.0";
    static objects = new Map([
        [ DeleteRow.KEY, false ],
    ]);

    constructor() {
        // TODO: Create the database schema
        // TODO: Perform any sanity checks
    }

    process(message, metadata) {
        // TODO: Implement the app logic
    }
}
