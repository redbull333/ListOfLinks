/*global chrome*/
(function () {
    const queryLines = ["link[rel='icon'][type='image/svg+xml']",
        "link[rel='apple-touch-icon'][sizes='192x192']",
        "link[rel='apple-touch-icon'][sizes='180x180']",
        "link[rel='icon'][sizes='192x192']",
        "link[rel='apple-touch-icon'][sizes='152x152']",
        "link[rel='apple-touch-icon'][sizes='144x144']",
        "link[rel='apple-touch-icon'][sizes='120x120']",
        "link[rel='icon'][sizes='144x144']",
        "link[rel='apple-touch-icon'][sizes='96x96']",
        "link[rel='apple-touch-icon'][sizes='76x76']",
        "link[rel='icon'][sizes='96x96']",
        "link[rel='apple-touch-icon'][sizes='64x64']",
        "link[rel='apple-touch-icon'][sizes='60x60']",
        "link[rel='icon'][sizes='64x64']",
        "link[rel='apple-touch-icon'][sizes='32x32']",
        "link[rel='icon'][sizes='32x32']",
        "link[rel='icon']",
        "link[rel='apple-touch-icon']",
        "link[rel='shortcut icon'][sizes='96x96']",
        "link[rel='shortcut icon'][sizes='64x64']",
        "link[rel='shortcut icon']",
        "link[rel='shortcut icon'][sizes='32x32']"];

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.text === "GET_SITE_DATA") {
            let srcIcon;
            for (const queryLine of queryLines) {
                srcIcon = document.querySelector(queryLine)?.href;
                if (srcIcon) {
                    break;
                }
            }

            srcIcon ??= location.origin + "/favicon.ico";

            if (location.origin === ("https://www.youtube.com")) {
                srcIcon = "/assets/youtubeicon.png";
            }

            sendResponse({
                text: 'GET_SITE_DATA',
                href: location.href,
                title: document.title,
                iconUrl: srcIcon,
                pageYOffset: window.pageYOffset
            });
        }

        if (msg.text === "GET_ALL_SITE_DATA") {
            let srcIcon;
            for (const queryLine of queryLines) {
                srcIcon = document.querySelector(queryLine)?.href;
                if (srcIcon) {
                    break;
                }
            }

            srcIcon ??= location.origin + "/favicon.ico";

            if (location.origin === ("https://www.youtube.com")) {
                srcIcon = "/assets/youtubeicon.png";
            }

            sendResponse({
                text: 'GET_ALL_SITE_DATA',
                href: location.href,
                title: document.title,
                iconUrl: srcIcon
            });
        }
    });
})();