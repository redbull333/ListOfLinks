import React, { useEffect } from "react";
import * as db from "../db";

export function AddButton(props) {
    let [buttonText, setButtonText] = React.useState('Добавить');

    useEffect(() => {
        document.onkeydown = async (e) => {
            if (e.code === "ShiftLeft" && !e.repeat) {
                setButtonText("Добавить все");
            }
            if (e.altKey && !e.repeat) {
                e.preventDefault();

                if (await db.count() > 1) {
                    setButtonText("Очистить");
                }
            }
        }
        document.onkeyup = (e) => {
            if (!e.shiftKey && !e.altKey) {
                setButtonText("Добавить");
            }
        };
    }, []);

    return <button className="addButton" onClick={props.onClick} onContextMenu={props.onContextMenu}>{buttonText}</button>;
}