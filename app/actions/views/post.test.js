// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import configureStore from 'redux-mock-store';
import thunk from 'redux-thunk';

import {Client4} from '@mm-redux/client';
import {PostTypes} from '@mm-redux/action_types';

import * as PostSelectors from '@mm-redux/selectors/entities/posts';
import * as ChannelUtils from '@mm-redux/utils/channel_utils';

import {ViewTypes} from 'app/constants';
import initialState from 'app/initial_state';

import {loadUnreadChannelPosts} from '@actions/views/post';

describe('Actions.Views.Post', () => {
    const mockStore = configureStore([thunk]);

    let store;
    const currentChannelId = 'current-channel-id';
    const storeObj = {
        ...initialState,
        entities: {
            ...initialState.entities,
            channels: {
                ...initialState.entities.channels,
                currentChannelId,
            },
        },
    };

    const channels = [
        {id: 'channel-1'},
        {id: 'channel-2'},
        {id: 'channel-3'},
    ];
    const channelMembers = [];

    test('loadUnreadChannelPosts does not dispatch actions if no unread channels', async () => {
        ChannelUtils.isUnreadChannel = jest.fn().mockReturnValue(false);

        store = mockStore(storeObj);
        await store.dispatch(loadUnreadChannelPosts(channels, channelMembers));

        const storeActions = store.getActions();
        expect(storeActions).toStrictEqual([]);
    });

    test('loadUnreadChannelPosts does not dispatch actions for current channel', async () => {
        ChannelUtils.isUnreadChannel = jest.fn().mockReturnValue(true);
        Client4.getPosts = jest.fn().mockResolvedValue({posts: ['post-1', 'post-2']});

        store = mockStore(storeObj);
        await store.dispatch(loadUnreadChannelPosts([{id: currentChannelId}], channelMembers));

        const storeActions = store.getActions();
        expect(storeActions).toStrictEqual([]);
    });

    test('loadUnreadChannelPosts dispatches actions for unread channels with no postIds in channel', async () => {
        ChannelUtils.isUnreadChannel = jest.fn().mockReturnValue(true);
        Client4.getPosts = jest.fn().mockResolvedValue({posts: ['post-1', 'post-2']});

        store = mockStore(storeObj);
        await store.dispatch(loadUnreadChannelPosts(channels, channelMembers));

        const actionTypes = store.getActions()[0].payload.map((action) => action.type);

        // Actions dispatched:
        // RECEIVED_POSTS_IN_CHANNEL and RECEIVED_POSTS_FOR_CHANNEL_AT_TIME for each channel.
        // RECEIVED_POSTS once, with all channel posts combined.
        expect(actionTypes.length).toBe((2 * channels.length) + 1);

        const receivedPostsInChannelActions = actionTypes.filter((type) => type === PostTypes.RECEIVED_POSTS_IN_CHANNEL);
        expect(receivedPostsInChannelActions.length).toBe(channels.length);

        const receivedPostsForChannelAtTimeActions = actionTypes.filter((type) => type === ViewTypes.RECEIVED_POSTS_FOR_CHANNEL_AT_TIME);
        expect(receivedPostsForChannelAtTimeActions.length).toBe(channels.length);

        const receivedPosts = actionTypes.filter((type) => type === 'RECEIVED_POSTS');
        expect(receivedPosts.length).toBe(1);
    });

    test('loadUnreadChannelPosts dispatches actions for unread channels with postIds in channel', async () => {
        ChannelUtils.isUnreadChannel = jest.fn().mockReturnValue(true);
        PostSelectors.getPostIdsInChannel = jest.fn().mockReturnValue(['post-id-in-channel']);
        Client4.getPostsSince = jest.fn().mockResolvedValue({posts: ['post-1', 'post-2']});

        const lastGetPosts = {};
        channels.forEach((channel) => {
            lastGetPosts[channel.id] = Date.now();
        });
        const lastConnectAt = Date.now() + 1000;
        store = mockStore({
            ...storeObj,
            views: {
                channel: {
                    lastGetPosts,
                },
            },
            websocket: {
                lastConnectAt,
            },
        });
        await store.dispatch(loadUnreadChannelPosts(channels, channelMembers));

        const actionTypes = store.getActions()[0].payload.map((action) => action.type);

        // Actions dispatched:
        // RECEIVED_POSTS_SINCE and RECEIVED_POSTS_FOR_CHANNEL_AT_TIME for each channel.
        // RECEIVED_POSTS once, with all channel posts combined.
        expect(actionTypes.length).toBe((2 * channels.length) + 1);

        const receivedPostsInChannelActions = actionTypes.filter((type) => type === PostTypes.RECEIVED_POSTS_SINCE);
        expect(receivedPostsInChannelActions.length).toBe(channels.length);

        const receivedPostsForChannelAtTimeActions = actionTypes.filter((type) => type === ViewTypes.RECEIVED_POSTS_FOR_CHANNEL_AT_TIME);
        expect(receivedPostsForChannelAtTimeActions.length).toBe(channels.length);

        const receivedPosts = actionTypes.filter((type) => type === PostTypes.RECEIVED_POSTS);
        expect(receivedPosts.length).toBe(1);
    });
});