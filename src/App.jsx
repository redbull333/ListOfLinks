import React, { useEffect, useState } from "react";
import "./style.css";
import * as db from "./db";
import { Link } from "./components/Link";
import { AddButton } from "./components/AddButton";
import { LinkList } from "./components/LinkList";

/*global chrome*/

const FETCH_TIMEOUT_MS = 1000;
const SHOW_INFO_DURATION_MS = 3400;

export function App() {
    const [links, setLinks] = useState([]);
    const [siteAlreadyExists, setSiteAlreadyExists] = useState(false);
    const [siteAdded, setSiteAdded] = useState(false);
    const [buttonBlocked, setButtonBlocked] = useState(false);
    const urlExistsDialog = React.useRef();


    function updateBadgeCounter() {
        db.count().then((count) => {
            chrome.action.setBadgeText({text: count.toString()});
            chrome.action.setBadgeBackgroundColor({color: '#095b8a'});
        });
    }

    function renderLinks() {
        db.getAllLinks().then((res) => {
            const links = res.map(link => {
                return {
                    id: link.href,
                    content: <Link href={link.href}
                                   title={link.title}
                                   imgblob={link.icon}
                                   locked={link.locked}
                                   onLocked={toggleLock}
                                   onChangeTitle={changeTitle}
                                   onClick={linkClick}
                                   onAuxClick={wheelClickDetect}
                                   onContextMenu={rightMouseClick}
                                   removeLink={removeLink}/>
                };
            });
            setLinks(links);
            updateBadgeCounter();
        });
    }

    function showSiteAdded() {
        setSiteAdded(true);
        setTimeout(() => {
            setSiteAdded(false)
        }, SHOW_INFO_DURATION_MS);
    }

    function showSiteAlreadyExists() {
        setSiteAlreadyExists(true);
        setTimeout(() => {
            setSiteAlreadyExists(false)
        }, SHOW_INFO_DURATION_MS);
    }

    function addLink(href, title, blob) {
        title = title.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        db.addLink(href, title, blob).then(() => {
            updateBadgeCounter();
        });
        setLinks(links => [...links, {
            id: href,
            content: <Link href={href}
                           title={title}
                           imgblob={blob}
                           locked={false}
                           onLocked={toggleLock}
                           onChangeTitle={changeTitle}
                           onClick={linkClick}
                           onAuxClick={wheelClickDetect}
                           onContextMenu={rightMouseClick}
                           removeLink={removeLink}/>
        }]);
    }

    function addLinkToTop(href, title, blob) {
        title = title.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

        db.addLinkToTop(href, title, blob).then(() => {
            updateBadgeCounter();
        });
        setLinks(links => [{
            id: href,
            content: <Link href={href}
                           title={title}
                           imgblob={blob}
                           locked={false}
                           onLocked={toggleLock}
                           onChangeTitle={changeTitle}
                           onClick={linkClick}
                           onAuxClick={wheelClickDetect}
                           onContextMenu={rightMouseClick}
                           removeLink={removeLink}/>
        }, ...links]);
    }

    function removeLink(e, href) {
        e.target.parentElement.animate(
            [
                {"height": e.target.parentElement.offsetHeight + "px"},
                {"height": "0"}
            ],
            {
                duration: 80,
                iterations: 1,
                fill: "both"
            }).onfinish = () => {
            db.deleteByHref(href);
            setLinks(links => links.filter(link => {
                return link.id !== href;
            }));
            updateBadgeCounter();
        }
    }

    function clearLinks() {
        db.clearAllData();
        setLinks([]);
        urlExistsDialog.current.close();
        updateBadgeCounter();
    }

    function addButtonClick(e) {
        if (!e.shiftKey && !e.altKey) {
            setButtonBlocked(true);
            chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
                const tab = tabs[0];

                if (await db.getByKey(tab.url)) {
                    showSiteAlreadyExists();
                    setButtonBlocked(false);
                    return;
                }

                await chrome.scripting
                    .executeScript({target: {tabId: tab.id}, files: ["content-script.js"]})
                    .then(() => {
                        chrome.tabs.sendMessage(tab.id, {text: "GET_SITE_DATA"}, async (msg) => {
                            fetch(msg.iconUrl, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)})
                                .then(res => {
                                    if (!res.ok) {
                                        throw Error("no icon");
                                    }
                                    return res.blob();
                                })
                                .then(blob => {
                                    if ( ! /^image/.test(blob.type) || !(blob.size > 0)) {
                                        throw Error('not an image');
                                    }

                                    addLink(tab.url, tab.title, blob);
                                })
                                .catch(async () => {
                                    fetch("/assets/deficon.svg")
                                        .then(res => res.blob())
                                        .then(blob => {
                                            addLink(tab.url, tab.title, blob);
                                        });
                                })
                                .finally(() => {
                                    showSiteAdded();
                                    setButtonBlocked(false);
                                });
                        });
                    })
                    .catch(async () => {
                        fetch(tab.favIconUrl || "/assets/deficon.svg")
                            .then(res => res.blob())
                            .then(blob => {
                                addLink(tab.url, tab.title, blob);
                                setButtonBlocked(false);
                                showSiteAdded();
                            });
                    });
            });
            return;
        }
        if (e.shiftKey) {
            chrome.tabs.query({currentWindow: true}, async (tabs) => {
                const map = new Map();
                for (const tab of tabs) {
                    map.set(tab.url, tab);
                }

                tabs = [...map.values()];

                let numTabs = tabs.length;
                let curTabIndex = 0;
                addNextTab()

                function addNextTab() {
                    if (curTabIndex === numTabs) return;
                    let tab = tabs[curTabIndex++];
                    if (tab.url.startsWith("chrome")) {
                        addNextTab();
                        return;
                    }
                    chrome.scripting
                        .executeScript({
                            target: {tabId: tab.id},
                            files: ["content-script.js"]
                        })
                        .then(() => {
                            chrome.tabs.sendMessage(tab.id, {text: "GET_ALL_SITE_DATA"}, async (msg) => {
                                if (msg.href.startsWith("https://feedly.com/")) {
                                    addNextTab();
                                    return;
                                }

                                let result = await db.getAllLinks();
                                if (result.some(({href}) => href === msg.href)) {
                                    showSiteAlreadyExists();
                                    addNextTab();
                                    return;
                                }

                                fetch(msg.iconUrl, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)})
                                    .then(res => {
                                        if (!res.ok) {
                                            throw Error("no icon");
                                        }
                                        return res.blob();
                                    })
                                    .then(async blob => {
                                        if ( ! /^image/.test(blob.type) || !(blob.size > 0)) {
                                            throw Error('not an image');
                                        }

                                        await addLink(msg.href, msg.title || msg.href, blob);
                                        addNextTab();
                                    })
                                    .catch(async () => {
                                        fetch(tab.favIconUrl || "/assets/deficon.svg")
                                            .then(res => res.blob())
                                            .then(async blob => {
                                                await addLink(msg.href, msg.title || msg.href, blob);
                                                addNextTab();
                                            });
                                    });
                            });
                        });
                }
            });
            return;
        }
        if (e.altKey) {
            urlExistsDialog.current.showModal();
        }
    }

    function addButtonRightClick(e) {
        e.preventDefault();
        setButtonBlocked(true);
        chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
            const tab = tabs[0];

            if (await db.getByKey(tab.url)) {
                showSiteAlreadyExists();
                setButtonBlocked(false);
                return;
            }

            await chrome.scripting
                .executeScript({target: {tabId: tab.id}, files: ["content-script.js"]})
                .then(() => {
                    chrome.tabs.sendMessage(tab.id, {text: "GET_SITE_DATA"}, async (msg) => {
                        fetch(msg.iconUrl, {signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)})
                            .then(res => {
                                if (!res.ok) {
                                    throw Error("no icon");
                                }
                                return res.blob();
                            })
                            .then(blob => {
                                if ( ! /^image/.test(blob.type) || !(blob.size > 0)) {
                                    throw Error('not an image');
                                }

                                addLinkToTop(tab.url, tab.title, blob);
                            })
                            .catch(async () => {
                                fetch("/assets/deficon.svg")
                                    .then(res => res.blob())
                                    .then(blob => {
                                        addLinkToTop(tab.url, tab.title, blob);
                                    });
                            })
                            .finally(() => {
                                showSiteAdded();
                                setButtonBlocked(false);
                            });
                    });
                })
                .catch(async () => {
                    fetch(tab.favIconUrl || "/assets/deficon.svg")
                        .then(res => res.blob())
                        .then(blob => {
                            addLinkToTop(tab.url, tab.title, blob);
                            setButtonBlocked(false);
                            showSiteAdded();
                        });
                })
                .finally(() => {
                    document.querySelector(".link-list")?.scrollTo(0, 0);
                })
        });
        return false;
    }

    function openTab(href, active) {
        chrome.tabs.create({url: href, active: active}).then((tab) => {
            const url = new URL(href);
            if (!url.searchParams.has("pageYOffset")) { return; }
            chrome.scripting.executeScript({target: {tabId: tab.id}, files: ["watcher-script.js"]});
        });
    }

    function linkClick(e, href, locked) {
        if (e.ctrlKey) {
            openTab(href, false);
        } else {
            openTab(href, true);
        }
        if (locked) {
            return;
        }
        db.deleteByHref(href);
        renderLinks();
    }

    function rightMouseClick(e, href, locked) {
        if (locked) {
            openTab(href, true);
            db.deleteByHref(href);
            renderLinks();
        } else {
            openTab(href, true);
        }
        return false;
    }

    function wheelClickDetect(e, href) {
        openTab(href, false);
    }

    async function changeTitle(href, newTitle) {
        await db.updateTitleByHref(href, newTitle);
        renderLinks();
    }

    async function toggleLock(linkURL) {
        await db.updateLockedByHref(linkURL);
        renderLinks();
    }

    function closeDialog() {
        urlExistsDialog.current.close();
    }

    async function onDragEnd(result) {
        if (!result.destination || result.destination.index === result.source.index) {
            return;
        }

        const reorder = (list, startIndex, endIndex) => {
            const result = Array.from(list);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            return result;
        };

        setLinks(links => reorder(links, result.source.index, result.destination.index));

        let links = await db.getAllLinks();
        const [removed] = links.splice(result.source.index, 1);
        links.splice(result.destination.index, 0, removed);
        await db.clearAndAddLinksAll(links);
    }

    useEffect(() => {
        document.addEventListener("keydown", async function exportLinks(e) {
            if (e.ctrlKey && e.code === "KeyS") {
                e.preventDefault();
                let a = document.createElement("a");
                const exportedLinks = (await db.getAllLinks()).map(links => links.href).join("\n");
                a.href = URL.createObjectURL(new Blob([exportedLinks], {type: "text/plain"}));
                a.download = "links.txt";
                a.click();
                a = null;
                document.removeEventListener("keydown", exportLinks);
            }
        });

        document.body.oncontextmenu = e => {
            e.preventDefault();
            return false;
        };

        document.addEventListener("keydown", function scrollHandler(e) {
            if (!e.ctrlKey) return;
            const scrollElement = document.querySelector(".link-list");

            if (e.code === "Numpad7" || e.code === "Home") {
                scrollElement?.scrollTo(0, 0);
            }
            if (e.code === "Numpad1" || e.code === "End") {
                scrollElement?.scrollTo(0, scrollElement?.scrollHeight);
            }
        })

        renderLinks();
    }, []);

    return (
        <>
            <dialog className="modal-clear-all" ref={urlExistsDialog}>
                <p style={{gridColumn: "1 / span 2", userSelect: "none", cursor: "default"}}>
                    Очистить список?
                </p>
                <button className="addButton withFocus" onClick={closeDialog}>Нет</button>
                <button className="addButton withFocus" onClick={clearLinks}>Да</button>
            </dialog>
            <div className="url-exists" style={{opacity: siteAlreadyExists ? 1 : 0}}>❌Already added</div>
            {!siteAlreadyExists && <div className="site-added" style={{opacity: siteAdded ? 1 : 0}}>Site added</div>}
            <AddButton onClick={!buttonBlocked ? addButtonClick : () => {}} onContextMenu={!buttonBlocked ? addButtonRightClick : () => {}}/>
            <LinkList onDragEnd={onDragEnd} links={links} onLocked={toggleLock}/>
        </>
    );
}