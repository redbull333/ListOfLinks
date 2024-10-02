import React, { useEffect } from "react";
import { LockerButton } from "./LockerButton";
import { RemoveButton } from "./RemoveButton";
import locker from "../images/locker.svg";

export function Link({
                         href,
                         title,
                         imgblob,
                         removeLink,
                         locked,
                         onLocked,
                         onChangeTitle,
                         onClick,
                         onAuxClick,
                         onContextMenu
                     }
) {
    const [editable, setEditable] = React.useState(false);
    const titleElement = React.useRef();

    useEffect(() => {
        if (editable) {
            titleElement.current.focus();
            titleElement.current.addEventListener("keydown", function enterKey(e) {
                if (e.code === "Enter") {
                    e.preventDefault();
                    setEditable(editable => !editable);
                    titleElement.current.removeEventListener("keydown", enterKey);
                    onChangeTitle(href, titleElement.current.textContent);
                }
            })
        }
    }, [editable]);

    const trimmedURL =
        href.replace(/^((https?|ftp):\/\/)(www\.)?/, "").replace(/\/$/, "");

    function lockerButtonClick() {
        onLocked(href);
    }

    function linkClick(e) {
        e.preventDefault();
        e.stopPropagation();

        if (e.altKey) {
            setEditable(true);
            return;
        }

        onClick(e, href, locked);
    }

    function wheelClickDetect(e) {
        if (e.button === 1) {
            e.preventDefault();
            e.stopPropagation();
            onAuxClick(e, href, locked);
        }
    }

    function rightMouseClick(e) {
        e.preventDefault();
        onContextMenu(e, href, locked);
        return false;
    }

    return (
        <>
            <a href={href} onClick={linkClick} onAuxClick={wheelClickDetect} onContextMenu={rightMouseClick}>
                <img className="favicon" src={URL.createObjectURL(imgblob)} alt=""/>
                <div className="link__title" dangerouslySetInnerHTML={{__html: title}} contentEditable={editable ? 'plaintext-only' : 'false'} ref={titleElement}/>
                <div className="link__href">{trimmedURL}</div>
            </a>
            <LockerButton icon={locker} locked={locked} onLocked={lockerButtonClick}/>
            <RemoveButton onRemove={(e) => { removeLink(e, href) }}/>
        </>
    );
}