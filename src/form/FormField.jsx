import React, { Component } from 'react';

export class FormField extends Component
{
    constructor(props)
    {
        super(props);
    }

    render()
    {
        let classes = ['field'];
        let props = Object.assign({style: {}}, this.props);

        if(this.props.className)
            classes.push(this.props.className);

        if(this.props.required)
            classes.push('required');

        if(this.props.invalid)
            classes.push('invalid');

        if(props.visible === false)
            props.style.display = 'none';

        return (
            <div id={props.id} className={classes.join(' ')} style={props.style}>
                {this.props.children}
            </div>
        );
    }
}
