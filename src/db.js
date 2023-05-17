const DB_NAME = "listOfLinks";
const DB_VER = 1;
const STORE_NAME = "links";

let db;

open();

export function open() {
    let request = indexedDB.open(DB_NAME, DB_VER);

    request.onupgradeneeded = function () {
        let db = this.result;
        db.createObjectStore(STORE_NAME, {keyPath: 'href'});
    };

    request.onsuccess = function () {
        db = this.result;
    };

    request.onerror = function () {
        throw Error("open error");
    }
}

export function clearAllData() {
    let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
    store.clear();
}

export function addLink(href, title, icon, locked = false) {
    if (!db) {
        throw Error("no db instance");
    }

    return new Promise(function (resolve) {
        getAllLinks().then(links => {
            let lastId = 0;
            if (links.length > 0) {
                lastId = Math.max(...links.map(link => link.id));
            }
            let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
            store.put({href, title, icon, id: lastId + 1, locked}).onsuccess = function () {
                resolve(this.result);
            };
        })
    });
}

export function addLinkToTop(href, title, icon, locked = false) {
    if (!db) {
        throw Error("no db instance");
    }

    return new Promise(function (resolve) {
        getAllLinks().then(links => {
            links = links.sort((a, b) => Number(a.id) - Number(b.id));

            let trans = db.transaction([STORE_NAME], "readwrite");
            let store = trans.objectStore(STORE_NAME);

            store.put({href, title, icon, locked, id: 1}).onerror = function () {
                throw Error("adding link error");
            };

            let id = 2;
            for (const {href, title, icon, locked} of links) {
                store.put({href, title, icon, locked, id: id++}).onerror = function () {
                    throw Error("adding link error");
                };
            }
            trans.oncomplete = function () {
                resolve(true);
            };
        });
    });
}

export function addLinksAll(links) {
    if (!db) {
        throw Error("no db instance");
    }

    let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
    let id = 1;
    for (const {href, title, icon, locked} of links) {
        store.put({href, title, icon, locked, id: id++}).onerror = function () {
            throw Error("adding link error");
        };
    }
}

export function clearAndAddLinksAll(links) {
    if (!db) {
        throw Error("no db instance");
    }

    return new Promise(function (resolve) {
        let trans = db.transaction([STORE_NAME], "readwrite");
        let store = trans.objectStore(STORE_NAME);

        store.clear().onsuccess = function () {
            let id = 1;
            for (const {href, title, icon, locked} of links) {
                store.put({href, title, icon, locked, id: id++}).onerror = function () {
                    throw Error("adding link error");
                };
            }
        };

        trans.oncomplete = function () {
            resolve(true);
        };
    });
}

export function getByKey(href) {
    if (!db) {
        throw Error("no db instance");
    }

    return new Promise(function (resolve) {
        let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
        store.get(href).onsuccess = function () {
            resolve(this.result);
        };
    });
}

export function deleteByHref(href) {
    if (!db) {
        throw Error("no db instance");
    }

    let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
    store.delete(href);
}

export function getAllLinks() {
    // if (!db) {
    //     throw Error("no db instance");
    // }

    return new Promise(function (resolve) {
        let request = indexedDB.open(DB_NAME, DB_VER);

        request.onsuccess = function () {
            let db = this.result;

            let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
            store.getAll().onsuccess = function (event) {
                resolve(event.target.result.sort((a, b) => Number(a.id) - Number(b.id)));
            };
        };
    });
}

export function getAllKeys() {
    return new Promise(function (resolve) {
        let request = indexedDB.open(DB_NAME, DB_VER);

        request.onsuccess = function () {
            let db = this.result;

            let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
            store.getAllKeys().onsuccess = function () {
                resolve(this.result);
            };
        };
    });
}

export function updateLockedByHref(href) {
    return new Promise(function (resolve) {
        let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
        const request = store.get(href);

        request.onsuccess = () => {
            const link = request.result;
            link.locked = !link.locked;
            const updateRequest = store.put(link);
            updateRequest.onsuccess = () => {
                resolve(updateRequest.result);
            }
        }
    });
}

export function updateTitleByHref(href, newTitle) {
    return new Promise(function (resolve) {
        let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
        const request = store.get(href);

        request.onsuccess = () => {
            const link = request.result;
            link.title = newTitle;
            const updateRequest = store.put(link);
            updateRequest.onsuccess = () => {
                resolve(updateRequest.result);
            }
        }
    });
}

export function count() {
    return new Promise(function (resolve) {
        let request = indexedDB.open(DB_NAME, DB_VER);

        request.onsuccess = function () {
            let db = this.result;

            let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
            store.count().onsuccess = function (event) {
                resolve(event.target.result);
            };
        };
    });
}

