import React from 'react';
import { View, Text, Image, ScrollView } from 'react-native';

interface Props {
    images: string[];
    description: string;
}

const AboutSection: React.FC<Props> = ({ images, description }) => {
    return (
        <View className="pb-4">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-9">
                {images.map((img) => (
                    <Image
                        key={img}
                        source={{ uri: img }}
                        className="w-[335] h-[195] rounded-xl mr-4"
                        resizeMode="cover"
                    />
                ))}
            </ScrollView>

            <Text className="text-lg font-semibold pl-3 mb-6">À propos de nous</Text>

            <Text className="text-base font-bold mb-4">
                {description}
            </Text>
        </View>
    );
};

export default AboutSection;
