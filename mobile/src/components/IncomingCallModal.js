import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getSocket } from '../config/socket';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../theme/colors';

const IncomingCallModal = () => {
  const [call, setCall] = useState(null);
  const { isAuthenticated, token } = useAuthStore();
  const navigation = useNavigation();
  const ringAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    const socket = getSocket(token);

    const handleIncomingCall = (data) => {
      console.log('Incoming call on mobile:', data);
      setCall(data);
      startRinging();
    };

    const handleCallEnded = () => {
      setCall(null);
    };

    socket.on('video:incoming-call', handleIncomingCall);
    socket.on('video:call-ended', handleCallEnded);

    return () => {
      socket.off('video:incoming-call', handleIncomingCall);
      socket.off('video:call-ended', handleCallEnded);
    };
  }, [isAuthenticated, token]);

  const startRinging = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const acceptCall = () => {
    const socket = getSocket(token);
    socket.emit('video:call-accepted', { callerId: call.from });
    const appointmentId = call.appointmentId;
    setCall(null);
    navigation.navigate('VideoConsultation', { id: appointmentId });
  };

  const rejectCall = () => {
    const socket = getSocket(token);
    socket.emit('video:call-rejected', { callerId: call.from });
    setCall(null);
  };

  if (!call) return null;

  return (
    <Modal transparent visible={!!call} animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Animated.View style={[styles.avatar, { transform: [{ scale: ringAnim }] }]}>
              <Text style={styles.avatarText}>
                {call.callerName?.charAt(0).toUpperCase() || 'D'}
              </Text>
            </Animated.View>
            <Text style={styles.title}>Incoming Call</Text>
            <Text style={styles.callerName}>{call.callerName}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={rejectCall}>
              <Ionicons name="close-outline" size={32} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={acceptCall}>
              <Ionicons name="videocam" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '80%',
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  title: {
    color: Colors.primary,
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 5,
  },
  callerName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    gap: 40,
  },
  btn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  rejectBtn: {
    backgroundColor: '#FF4444',
  },
  acceptBtn: {
    backgroundColor: '#00C851',
  },
});

export default IncomingCallModal;
