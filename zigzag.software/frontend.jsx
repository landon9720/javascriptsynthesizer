import React from 'react'
import ReactDOM from 'react-dom'
import { Route, Switch, HashRouter, Link } from 'react-router-dom'
import {withRouter} from 'react-router-dom'

import 'mini.css'

const App = withRouter(() =>
    <div>
        <Switch>
            <Route exact path="/" component={Page} />
            <Route path="/:id" component={Page} />
        </Switch>
    </div>
)

const Page = ({ match }) =>
    (
        <div>
            <header>
                <a href="/" class="button">Zigzag</a>
            </header>
            {pageContent(match.params.id || 'index')}
            <footer>
                <div>
                    <iframe src="https://ghbtns.com/github-btn.html?user=landon9720&repo=zigzag&type=star&count=true" frameBorder="0" scrolling="0" width="170px" height="20px"></iframe>
                </div>
                <small>© 2018 Landon Kuhn <a href="http://landon9720.com">landon9720.com</a></small>
            </footer>
        </div>
    )


const pageContent = id => {
    try {
        const h = require('./pages/' + id + '.md')
        return <div dangerouslySetInnerHTML={{ __html: h }} />
    } catch (e) {
        try {
            return require('./pages/' + id + '.jsx').default
        } catch (f) {
            return <p>404</p>
        }
    }
}

ReactDOM.render(
    <HashRouter hashType="noslash">
        <App />
    </HashRouter>,
    document.getElementById('root')
)
