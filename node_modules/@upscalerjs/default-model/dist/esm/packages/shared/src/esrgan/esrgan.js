const isTensorArray = (inputs) => {
    return Array.isArray(inputs);
};
const getInput = (inputs) => {
    if (isTensorArray(inputs)) {
        return inputs[0];
    }
    return inputs;
};
export const getESRGANModelDefinition = ({ scale, name, version, meta: { architecture, ...meta }, path: modelPath, }) => {
    const path = modelPath || `models/x${scale}/model.json`;
    if (architecture === 'rdn') {
        return {
            scale,
            modelType: 'layers',
            _internals: {
                path,
                name,
                version,
            },
            meta: {
                architecture,
                ...meta,
            },
            inputRange: [0, 255,],
            outputRange: [0, 255,],
        };
    }
    const setup = (tf) => {
        const Layer = tf.layers.Layer;
        const BETA = 0.2;
        class MultiplyBeta extends Layer {
            beta;
            constructor() {
                super({});
                this.beta = BETA;
            }
            call(inputs) {
                return tf.mul(getInput(inputs), this.beta);
            }
            static className = 'MultiplyBeta';
        }
        const getPixelShuffle = (_scale) => {
            class PixelShuffle extends Layer {
                scale = _scale;
                constructor() {
                    super({});
                }
                computeOutputShape(inputShape) {
                    return [inputShape[0], inputShape[1], inputShape[2], 3,];
                }
                call(inputs) {
                    return tf.depthToSpace(getInput(inputs), this.scale, 'NHWC');
                }
                static className = `PixelShuffle${scale}x`;
            }
            return PixelShuffle;
        };
        [
            MultiplyBeta,
            getPixelShuffle(scale),
        ].forEach((layer) => {
            tf.serialization.registerClass(layer);
        });
    };
    return {
        setup,
        scale,
        modelType: 'layers',
        _internals: {
            path,
            name,
            version,
        },
        meta: {
            architecture,
            ...meta,
        },
        inputRange: [0, 1,],
        outputRange: [0, 1,],
    };
};
