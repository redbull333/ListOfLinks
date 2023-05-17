import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import React from "react";

function Links({links}) {
    return links.map((link, index) => (
        <Draggable draggableId={link.id} index={index} key={link.id}>
            {(provided) => {
                let style = provided.draggableProps.style;
                if (style.transform) {
                    style.transform = `translate(0, ${style?.transform?.match(/.*?(-?\d+)(?:px)?\)/)[1]}px)`;
                }

                return (
                    <div className="link-list__link"
                         ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                         style={style}>
                        {link.content}
                    </div>
                );
            }}
        </Draggable>
    ));
}

export function LinkList({links, onDragEnd}) {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="list">
                {provided => (
                    <div className="link-list" ref={provided.innerRef} {...provided.droppableProps}>
                        <Links links={links}/>
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}