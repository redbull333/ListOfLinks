export function RemoveButton({onRemove}) {
    return (
        <div onClick={onRemove} className="removeLink">×</div>
    );
}