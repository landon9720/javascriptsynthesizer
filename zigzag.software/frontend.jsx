import _ from 'lodash'
import React from 'react'
import ReactDOM from 'react-dom'
import { Route, Switch, HashRouter, Link } from 'react-router-dom'

import 'mini.css'

const App = () => (
    <div>
        <Switch>
            <Route exact path="/" component={componentFor('index')} />
            <Route path="/:id" component={Page} />
        </Switch>
    </div>
)

const componentFor = id => {
    try {
        const h = require('./pages/' + id + '.md')
        return () => <div dangerouslySetInnerHTML={{ __html: h }} />
    } catch (e) {
        try {
            return require('./pages/' + id + '.jsx').default
        } catch (f) {
            return () => <div>404</div>
        }
    }
}

class Page extends React.Component {
    render() {
        const { match } = this.props
        const PageComponent = componentFor(match.params.id)
        return (
            <div>
                <PageComponent />
            </div>
        )
    }
}

ReactDOM.render(
    <HashRouter hashType="noslash">
        <App />
    </HashRouter>,
    document.getElementById('root')
)
