import React, { useRef, useEffect, useState } from "react";
import { Styled } from "direflow-component";
import styles from "./mainPage.css";
import RoomList from './roomList/roomList'
import InviteRoomList from './inviteRoomList/inviteRoomList'
import {
  calculateRoomName,
  getAddressByUserId,
  getMsgStr,
  getInviteSendEvent,
  getDmUserAddress,
} from "../../utils/index";
import { api } from "../../api";
import sns from "@seedao/sns-js";

let roomCount = 0;

const MainPage = ({ rooms, enterRoom, menuFuncs, onMenuClick }) => {
	const [roomListType, setRoomListType] = useState('roomList')
	const [closeModalms, setCloseModalms] = useState('');
	const [roomList, setRoomList] = useState([]);
	const [afterRoomList, setAfterRoomList] = useState([]);

	useEffect(() => {
		if (!roomList.length) {
		return;
		}
		const userAddressList = [];
		roomList.forEach((m) => {
		if (m.isDmRoom()) {
			const user_address = getDmUserAddress(m);
			userAddressList.push({ rid: m.roomId, address: user_address });
		}
		});
		if (userAddressList.length) {
			sns.names(userAddressList.map((m) => m.address)).then((res) => {
				if (roomList.length < roomCount) { 
					return;
				}
				const snsMap = {};
				res.forEach((m, i) => {
					snsMap[userAddressList[i].rid] = m;
				});
				roomList.forEach((m) => { m.name = snsMap[m.roomId] || m.name; });
				setAfterRoomList([...roomList]);
			})
		}
	}, [roomList.length]);

	useEffect(() => {
		initRoomList(rooms);
	}, [rooms, rooms?.length])

	const initRoomList = (list) => {
		const resultList = [];
		for (let i = 0; i < list.length; i++) {
			const m = list[i];
			m.calculateName = handleRoomName(m);
			m.lastMsgTs = getLastMsgTs(m);
			// if (m.calculateName !== 'Empty Room') {
				resultList.push(m);
			// }
		}
		resultList.sort((a, b) => b.lastMsgTs - a.lastMsgTs)
		setRoomList(resultList);
		setAfterRoomList(resultList);
		roomCount = resultList.length;
	}

	const getInviteSendTs = (senderEvent) => {
    return senderEvent?.event?.origin_server_ts
  }

	const getLastMsgTs = (room) => {
		if (!room) return 0;
		const timeline = room.getLiveTimeline();
		const events = timeline.getEvents();
    const isDmRoom = room.isDmRoom();
    const userId = api.getUserId();
		if (events.length) {
			let lastEvent;
      for (let i = events.length - 1; i >= 0; i--) {
        lastEvent = events[i];
        if (getMsgStr(lastEvent, isDmRoom, userId)) {
          return lastEvent.getTs();
        }
				else { // just join room
					const senderEvent = getInviteSendEvent(room)
					return getInviteSendTs(senderEvent)
				}
      }
		}
		return 0;
	}

	const handleRoomName = (room) => {
		let result = "";
		const ship = room.getMyMembership()
		if (ship === 'join') {
			result = calculateRoomName(room);
		} else if (ship === 'invite') {
			const { name, roomId } = room;
			result = name;
			if (/^@sdn_/.test(name)) {
				const inviterId = roomId.split('-')[1];
				result = getAddressByUserId(inviterId) || name;
			}
		}
		return result;
	}

  return (
		<Styled styles={styles}>
			<div className="chat_widget_main_page" onClick={() => { setCloseModalms(new Date().getTime()) }}>
				{roomListType === 'roomList' ? <RoomList
					setRoomListType={setRoomListType}
					rooms={afterRoomList}
					menuFuncs={menuFuncs}
					enterRoom={enterRoom}
					closeModalms={closeModalms}
					menuClick={onMenuClick}
				/> : 
				<InviteRoomList
					setRoomListType={setRoomListType}
					rooms={afterRoomList}
					menuFuncs={menuFuncs}
					closeModalms={closeModalms}
					menuClick={onMenuClick}
				/>}
			</div>
		</Styled>
  );
};

export default MainPage;
