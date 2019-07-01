import React, {useEffect, useReducer} from 'react';
import './App.css';
import { List, Skeleton } from 'antd';

import { API, graphqlOperation } from 'aws-amplify'
import { withAuthenticator } from 'aws-amplify-react'

import { listReports } from './queries'
import { onCreateReport, onDeleteReport } from './subscriptions'
import { deleteComment as DeleteComment, deleteReport, createBannedId } from './mutations'

const initialState = {
  reports: [],
  error: false,
  loading: true
}

function reducer(state, action) {
  switch(action.type) {
    case 'SET_REPORTS':
      return {
        ...state, reports: action.reports, loading: false
      }
    case 'DELETE_COMMENT':
        const filteredReports = [...state.reports.filter(r => r.commentId !== action.commentId)]
        return {
          ...state, reports: filteredReports
        }
    case 'REMOVE_REPORTS':
        const reports = state.reports.filter(r => r.id !== action.report.id)
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
        const report = eventData.value.data.onCreateReport
        dispatch({ type: 'ADD_REPORT', report  })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const subscription = API.graphql(graphqlOperation(onDeleteReport)).subscribe({
      next: eventData => {
        const report = eventData.value.data.onDeleteReport
        dispatch({ type: 'REMOVE_REPORTS', report  })
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchReports() {
    try {
      const reportData = await API.graphql(graphqlOperation(listReports))
      dispatch({ type: 'SET_REPORTS' , reports: reportData.data.listReports.items })
    } catch (err) {
      console.log('error fetching data: ', err)
    }
  }

  async function blockDevice(id) {
    try {
      await API.graphql(graphqlOperation(createBannedId, { id }))
      alert('Device successfully blocked')
    } catch (err) {
      console.log('error blocking device: ', err)
    }
  }

  function renderItem(item) {
    return (
      <List.Item actions={[
      <a onClick={() => deleteComment(item.commentId, dispatch, state.reports)}>Delete Comment</a>,
      <a onClick={() => dismissReport(item.commentId, dispatch, state.reports)}>Dismiss Report</a>,
      <a onClick={() => blockDevice(item.deviceId)}>Block Device</a>]}>
        <Skeleton avatar title={false} active loading={state.loading}>
          <List.Item.Meta
            style={{ textAlign: 'left' }}
            title={<p>{item.talkTitle}</p>}
            description={<h3>{item.comment}</h3>}
          />
          <p>{item.deviceId}</p>
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
          loading={state.loading}
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
