

window.onload = function () {
    let url = new URL(location.href);
    let offset = url.searchParams.get("pageYOffset");
    if (!offset) { return }
    url.searchParams.delete("pageYOffset");
    history.replaceState(null, null, url.href);
    window.scrollTo(0, Number(offset));
}