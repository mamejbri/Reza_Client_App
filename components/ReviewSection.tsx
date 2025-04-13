import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, TextInput } from 'react-native';
import IcoMoonIcon from '../src/icons/IcoMoonIcon';

interface Review {
    user_id: string;
    rating: number;
    comment: string;
    date: string;
}

interface Props {
    reviews: Review[];
}

const ReviewSection: React.FC<Props> = ({ reviews }) => {
    const [userRating, setUserRating] = useState(4);
    const [editingComment, setEditingComment] = useState(false);
    const [userComment, setUserComment] = useState('');

    return (
        <View className="mt-2 mb-6">
            {/* User Review Input */}
            <View className="bg-gray-100 rounded-2xl p-2.5 mb-9">
                <View className="py-4">
                    <View className="flex-row items-center mb-4">
                        <Image
                            source={require('../assets/images/avatar.png')}
                            className="w-[54] h-[54] rounded-full"
                        />
                        <View className="flex-1 ml-5">
                            <Text className="font-medium text-base mb-2">Moi</Text>
                            <View className="flex-row gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <TouchableOpacity key={i} onPress={() => setUserRating(i)}>
                                        <IcoMoonIcon
                                            name="star-solid"
                                            size={20}
                                            color={i <= userRating ? '#e11d48' : '#d1d5db'}
                                        />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {editingComment ? (
                        <TextInput
                            multiline
                            value={userComment}
                            onChangeText={setUserComment}
                            className="border border-gray-300 rounded-lg p-2 h-24 text-gray-800"
                            placeholder="Je rédige mon avis"
                        />
                    ) : (
                        <TouchableOpacity className="flex-row items-center px-4" onPress={() => setEditingComment(true)}>
                            <Text className="flex-grow">Je rédige mon avis</Text>
                            <IcoMoonIcon name="pen" size={20} color="#000" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Reviews Count */}
            <View className="flex-row align-center gap-2 mb-5">
                <IcoMoonIcon name="star-solid" size={20} color="#e11d48" />
                <Text className="font-semibold text-lg">{reviews.length} avis</Text>
            </View>

            {/* Display Existing Reviews */}
            {reviews.map((item, index) => (
                <View key={`${item.user_id}-${index}`} className="bg-gray-100 rounded-2xl p-2.5 mb-4">
                    <View className="py-4">
                        <View className="flex-row items-center mb-2.5">
                            <Image
                                source={require('../assets/images/avatar.png')}
                                className="w-[54] h-[54] rounded-full"
                            />
                            <View className="ml-5">
                                <Text className="font-medium text-base mb-2">Utilisateur {item.user_id}</Text>
                                <View className="flex-row gap-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <IcoMoonIcon
                                            key={i}
                                            name="star-solid"
                                            size={20}
                                            color={i <= item.rating ? '#e11d48' : '#d1d5db'}
                                        />
                                    ))}
                                </View>
                            </View>
                        </View>
                        <Text className="italic font-light">{item.comment}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
};

export default ReviewSection;
