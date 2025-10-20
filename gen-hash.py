#!/usr/bin/env python3

"""
Recompute digest value for given modules and update imports

TODO: 1. Use a JS parser
      2. Generate an actual import tree and iterate on that
"""

import io
import os
import re
import sys
import base64
import hashlib
import subprocess

from os.path import dirname, join, realpath, isfile
from itertools import chain


def genpath(*a):
    return realpath(join(sys.path[0], *a))


# The order here is sort-of the import order, starting from the top.
# This list must be kept updated as more files get added.
MODULES = [
    (
        genpath("model", "Base.mjs"),
        "https://sobamail.com/module/base/v1",
    ),
    (
        genpath("model", "MailboxManagerEvent.mjs"),
        "https://sobamail.com/module/mailboxmanager/v1",
    ),
    (
        genpath("model", "UserManagerEvent.mjs"),
        "https://sobamail.com/module/usermanager/v1",
    ),
    # Apps
    (
        genpath("mutator", "UserManager.mjs"),
        "https://usermanager.app.sobamail.com",
    ),
    (
        genpath("Skel.mjs"),
        "https://test.user.app.sobamail.com",
    ),
    (
        genpath("..", "mbmgr", "MailboxManager.mjs"),
        "https://mailboxmanager.core.app.sobamail.com",
    ),
    (
        genpath("..", "responder", "Mutator.mjs"),
        "https://responder.test.user.app.sobamail.com",
    ),
]

# format
for fn, _ in MODULES:
    if fn.endswith(".mjs"):
        retcode = subprocess.check_call(["clang-format", "-i", "--style=file", fn])
        print("Format", fn)

print()

# rehash
for i, (fn, ns) in enumerate(MODULES):
    if not isfile(fn):
        continue

    # recompute own hash
    with io.open(fn, "rb") as f:
        digest = hashlib.sha224(f.read()).digest()

        digest_b64 = base64.urlsafe_b64encode(digest).decode("ascii").replace("=", "")
        with io.open(f"{fn}.sha224.b64us", "w") as f:
            f.write('"')
            f.write(digest_b64)
            f.write('"')

        digest_b32hex = base64.b32hexencode(digest).decode("ascii").replace("=", "")
        with io.open(f"{fn}.sha224.b32hex", "w") as f:
            f.write('"')
            f.write(digest_b32hex)
            f.write('"')

        print("Rehash", fn)

    print("\tNS ", ns)

    for fnm, _ in MODULES[i + 1 :]:
        if not os.path.exists(fnm):
            print("\tMISSING FILE", fnm)
            continue

        fdata = io.open(fnm, "r", encoding="utf8").read()

        pattern = f"{ns}\\?sha224=[A-Za-z0-9_-]+"
        found = re.search(pattern, fdata)
        if not found:
            continue

        space = "\n"

        oldval = found[0]
        newval = f"{ns}?sha224={digest_b64}"

        # print(oldval)
        # print(newval)
        if oldval == newval:
            print("\tOLD", fnm)
            continue

        fdata = re.sub(pattern, newval, fdata)
        io.open(fnm, "w+", encoding="utf8").write(fdata)
        print("\tNEW", fnm)

    print()
