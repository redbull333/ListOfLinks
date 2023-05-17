export function LockerButton({icon, locked, onLocked}) {
    return (
        <div className={"locker" + (locked ? " locked" : "")} onClick={onLocked}>
            <img src={icon} alt=""/>
        </div>
    );
}