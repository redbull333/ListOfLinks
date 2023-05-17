/*global chrome*/

const DB_NAME = "listOfLinks";
const DB_VER = 1;
const STORE_NAME = "links";



chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "AddInList",
        title: "Добавить в список",
        contexts: ["page"],
    });

    let request = indexedDB.open(DB_NAME, DB_VER);

    request.onupgradeneeded = function () {
        let db = this.result;
        db.createObjectStore(STORE_NAME, {keyPath: 'href'});
    };
});

chrome.runtime.onMessage.addListener(async (msg) => {

});

chrome.contextMenus.onClicked.addListener(() => {
    let db;
    let request = indexedDB.open(DB_NAME, DB_VER);

    request.onsuccess = function () {
        db = this.result;
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            const tab = tabs[0];

            await chrome.scripting
                .executeScript({
                    target: {tabId: tab?.id},
                    files: ["content-script.js"]
                })
                .then(() => {
                    chrome.tabs.sendMessage(tab.id, {text: "GET_SITE_DATA"}, async (msg) => {
						let url = new URL(tab.url);
						url.searchParams.append("pageYOffset", Math.round(msg.pageYOffset).toString());
						url = url.href;

						if (await getByKey(url)) {
							return;
						}

						fetch(msg.iconUrl, {signal: AbortSignal.timeout(3000)})
                            .then(res => {
                                if (!res.ok) {
                                    throw Error("no icon");
                                }
                                return res.blob();
                            })
                            .then(blob => {
                                addLinkToTop(url, tab.title, blob);
                            })
                            .catch(async () => {
                                fetch("/assets/deficon.svg")
                                    .then(res => res.blob())
                                    .then(blob => {
                                        addLinkToTop(url, tab.title, blob);
                                    });
                            })

                    });
                })
                .catch(async () => {
					if (await getByKey(tab.url)) {
							return;
					}

                    fetch("/assets/deficon.svg")
                        .then(res => res.blob())
                        .then(blob => {
                            addLinkToTop(tab.url, tab.title, blob);
                        });
                });
        });
    };

    function addLinkToTop(href, title, icon, locked = false) {
        let trans = db.transaction([STORE_NAME], "readwrite");
        let store = trans.objectStore(STORE_NAME);

        store.getAll().onsuccess = function (event) {
            let links = event.target.result.sort((a, b) => Number(a.id) - Number(b.id));

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
                let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
                store.count().onsuccess = function (event) {
                    const count = event.target.result;
                    chrome.action.setBadgeText({text: count.toString()});
                    chrome.action.setBadgeBackgroundColor({color: '#095b8a'});
                };
            }
        };
    }

    function getByKey(href) {
        return new Promise(function (resolve) {
            let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
            store.get(href).onsuccess = function (event) {
                resolve(event.target.result);
            };
        });
    }
});

function count() {
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

let request = indexedDB.open(DB_NAME, DB_VER);

request.onupgradeneeded = function () {
    let db = this.result;
    db.createObjectStore(STORE_NAME, {keyPath: 'href'});
};

request.onsuccess = function () {
    let db = this.result;

    let store = db.transaction([STORE_NAME], "readwrite").objectStore(STORE_NAME);
    store.count().onsuccess = function (event) {
        chrome.action.setBadgeText({text: this.result.toString()});
        chrome.action.setBadgeBackgroundColor({color: '#095b8a'});
    };
};