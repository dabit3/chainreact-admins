import React, {useEffect, useReducer} from 'react';
import './App.css';
import { List, Button, Skeleton } from 'antd';

import { API, graphqlOperation } from 'aws-amplify'
import { withAuthenticator } from 'aws-amplify-react'

import { listReports } from './queries'
import { onCreateReport, onDeleteReport } from './subscriptions'
import { deleteComment as DeleteComment, deleteReport } from './mutations'

const initialState = {
  reports: [],
  error: false
}

function reducer(state, action) {
  switch(action.type) {
    case 'SET_REPORTS':
      return {
        ...state, reports: action.reports
      }
    case 'DELETE_COMMENT':
        const reports = [...state.reports.filter(r => r.commentId !== action.commentId)]
        return {
          ...state, reports
        }
    case 'ADD_REPORT':
        return {
          ...state, reports: [action.report, ...state.reports]
        }
    default:
      return state
  }
}

async function dismissReport(commentId, dispatch, reports) {
  dispatch({ type: 'DELETE_COMMENT', commentId })
  const reportList = reports.filter(r => r.commentId === commentId)
  const operations = reportList.map(r => API.graphql(graphqlOperation(deleteReport, { id: r.id })))
  try {
    await Promise.all(operations)
    console.log('reports deleted')
  } catch(err) {
    console.log('error deleting report: ', err)
  }
}

async function deleteComment(commentId, dispatch, reports) {
  const reportList = reports.filter(r => r.commentId === commentId)
  const operations = reportList.map(r => API.graphql(graphqlOperation(deleteReport, { id: r.id })))
  
  try {
    dispatch({ type: 'DELETE_COMMENT', commentId })
    await Promise.all(operations)
    await API.graphql(graphqlOperation(DeleteComment, { id: commentId }))
    console.log('comment deleted')
  } catch (err) {
    console.log('error: ', err)
  }
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    const subscription = API.graphql(graphqlOperation(onCreateReport)).subscribe({
      next: eventData => {
        console.log('eventData: ', eventData)
        const report = eventData.value.data.onCreateReport
        dispatch({ type: 'ADD_REPORT', report  })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const subscription = API.graphql(graphqlOperation(onDeleteReport)).subscribe({
      next: eventData => {
        console.log('eventData :', eventData)
        const report = eventData.value.data.onDeleteReport
        const reports = state.reports.filter(r => r.id !== report.id)
        console.log('reports: ', reports)
        dispatch({ type: 'SET_REPORTS', reports  })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchReports() {
    try {
      const reportData = await API.graphql(graphqlOperation(listReports))
      console.log('reportData: ', reportData)
      dispatch({ type: 'SET_REPORTS' , reports: reportData.data.listReports.items })
    } catch (err) {
      console.log('error fetching data: ', err)
    }
  }

  function renderItem(item) {
    return (
      <List.Item actions={[
      <a onClick={() => deleteComment(item.commentId, dispatch, state.reports)}>Delete Comment</a>,
      <a onClick={() => dismissReport(item.commentId, dispatch, state.reports)}>Dismiss Report</a>]}>
        <Skeleton avatar title={false} active loading={false}>
          <List.Item.Meta
            style={{ textAlign: 'left' }}
            title={<p>{item.talkTitle}</p>}
            description={<h3>{item.comment}</h3>}
          />
        </Skeleton>
      </List.Item>
    )
  }

  return (
    <div className="App">
        <List
          style={{ padding: '0px 25px' }}
          renderItem={renderItem}
          className="demo-loadmore-list"
          loading={false}
          itemLayout="horizontal"
          dataSource={state.reports}
        />
        {/* {
          state.reports.map((r, index) => (
            <div key={index}>
             <p>{r.comment}</p>
             <p>{r.talkTitle}</p>
            </div>
          ))
        } */}
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true })
