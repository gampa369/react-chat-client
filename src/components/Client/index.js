import React, { Component } from 'react';
import { connect } from 'react-redux';

// CONSTANTS
import { Styles, UI } from '../../constants';

// COMPONENTS
import Socket from '../../utils/Socket.js';
import UserInput from '../UserInput'
import RecipientSelector from '../RecipientSelector';
import PortSelector from '../PortSelector';
import MessageTransport from '../MessageTransport';
import MessageHistory from '../MessageHistory';
import Footer from '../Footer';

// ACTIONS
import { messageReceived, clientUpdateReceived, recipientChanged } from '../../store/message/actions';
import { connectionChanged } from '../../store/socket/actions';
import { statusChanged } from '../../store/status/actions';

// Main client component
class Client extends Component {
    constructor(props) {
        super(props);
        this.socket = new Socket(
            this.onConnectionChange,
            this.onSocketError,
            this.onIncomingMessage,
            this.onUpdateClient
        );
    }

    // The socket's connection state changed
    onConnectionChange = isConnected => {
        this.props.dispatch(connectionChanged(isConnected));
        this.props.dispatch(statusChanged(isConnected ? 'Connected' : 'Disconnected'));
    };

    // There has been a socket error
    onSocketError = (status) => this.props.dispatch(statusChanged(status, true));

    // The client has received a message
    onIncomingMessage = message => this.props.dispatch(messageReceived(message));

    // The server has updated us with a list of all users currently on the system
    onUpdateClient = message => {

        // Remove this user from the list
        const otherUsers = message.list.filter(user => user !== this.props.user);

        // Has our recipient disconnected?
        const recipientLost = this.props.recipient !== UI.NO_RECIPIENT && !(message.list.find(user => user === this.props.recipient));

        // Has our previously disconnected recipient reconnected?
        const recipientFound = !!this.props.lostRecipient && !!message.list.find(user => user === this.props.lostRecipient);

        const dispatchUpdate = () => {
            this.props.dispatch(clientUpdateReceived(otherUsers, recipientLost));
        };

        if (recipientLost && !this.props.recipientLost) { // recipient just now disconnected
            this.props.dispatch(statusChanged(`${this.props.recipient} ${UI.RECIPIENT_LOST}`, true));
            dispatchUpdate();
        } else if (recipientFound) { // previously lost recipient just reconnected
            this.props.dispatch(statusChanged(`${this.props.lostRecipient} ${UI.RECIPIENT_FOUND}`));
            dispatchUpdate();
            this.props.dispatch(recipientChanged(this.props.lostRecipient));
        } else {
            dispatchUpdate();
        }
    };

    // Render the component
    render() {
        return <div style={Styles.clientStyle}>

            <UserInput/>

            <PortSelector/>

            <RecipientSelector/>

            <MessageTransport socket={this.socket}/>

            <MessageHistory/>

            <Footer socket={this.socket}/>

        </div>;
    }
}

// Map required state into props
const mapStateToProps = (state) => ({
    recipient: state.messageState.recipient,
    lostRecipient: state.messageState.lostRecipient,
    user: state.messageState.user
});

// Map dispatch function into props
const mapDispatchToProps = (dispatch) => ({
    dispatch: dispatch
});

// Export props-mapped HOC
export default connect(mapStateToProps, mapDispatchToProps)(Client);