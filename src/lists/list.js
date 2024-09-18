import { Button, Div, Form, H1, Input, Li, Ul } from '@base-framework/atoms';
import { Data, Jot } from '@base-framework/base';

export const List = Jot(
{
    // @ts-ignore
	setData(){ new Data({ [this.prop]: [] })},

	// handle form submission
    handleSubmit(event)
    {
        event.preventDefault();
        const form = event.target;
        const input = form.querySelector('input');

        // add the new to-do item to the array of items
        // @ts-ignore
        this.data.push(this.prop, input.value);
        input.value = '';
    },

    // handle item removal
    // @ts-ignore
    remove(index){ this.data.splice(this.prop, index)},

	render()
    {
        return Div([
            H1('To-Do App'),
            // @ts-ignore
            Form({ submit: (e) => this.handleSubmit(e) }, [
                Input({ placeholder: 'Add a new item' }),
                Button({ type: 'submit' }, 'Add')
            ]),
            Ul({
                for: ['items', (text, index) => Li({
                    text,
                    // @ts-ignore
                    button: Button({ click: () => this.handleRemove(index) }, 'Remove')
                })]
            })
        ]);
    }
});