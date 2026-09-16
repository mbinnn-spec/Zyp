(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('@upscalerjs/default-model'), require('@tensorflow/tfjs-core'), require('@tensorflow/tfjs')) :
    typeof define === 'function' && define.amd ? define(['@upscalerjs/default-model', '@tensorflow/tfjs-core', '@tensorflow/tfjs'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Upscaler = factory(global.DefaultUpscalerJSModel, global.tf, global.tf));
})(this, (function (DefaultUpscalerModel, tf, tf$1) { 'use strict';

    function _interopNamespaceDefault(e) {
        var n = Object.create(null);
        if (e) {
            Object.keys(e).forEach(function (k) {
                if (k !== 'default') {
                    var d = Object.getOwnPropertyDescriptor(e, k);
                    Object.defineProperty(n, k, d.get ? d : {
                        enumerable: true,
                        get: function () { return e[k]; }
                    });
                }
            });
        }
        n.default = e;
        return Object.freeze(n);
    }

    var tf__namespace = /*#__PURE__*/_interopNamespaceDefault(tf);
    var tf__namespace$1 = /*#__PURE__*/_interopNamespaceDefault(tf$1);

    const WARNING_DEPRECATED_MODEL_DEFINITION_URL = 'https://upscalerjs.com/documentation/troubleshooting#deprecated-model-definition-function';
    const WARNING_DEPRECATED_MODEL_DEFINITION_FN = [
        'Passing a model definition as a function is deprecated and will be removed in a future version.',
        'To leverage model lifecycle methods, use the setup and teardown methods.',
        `For more information, see ${WARNING_DEPRECATED_MODEL_DEFINITION_URL}.`,
    ].join(' ');
    const WARNING_UNDEFINED_PADDING_URL = 'https://upscalerjs.com/documentation/troubleshooting#padding-is-undefined';
    const WARNING_UNDEFINED_PADDING = [
        '"padding" is undefined, but "patchSize" is explicitly defined.',
        'Without padding, patches of images often have visible artifacting at the seams. Defining an explicit padding will resolve the artifacting.',
        `For more information, see ${WARNING_UNDEFINED_PADDING_URL}.`,
        'To hide this warning, pass an explicit padding of "0".',
    ].join(' ');
    const WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL = 'https://upscalerjs.com/documentation/troubleshooting#progress-specified-without-patch-size';
    const WARNING_PROGRESS_WITHOUT_PATCH_SIZE = [
        'The "progress" callback was provided but "patchSize" was not defined.',
        'Without a "patchSize", the "progress" callback will never be called.',
        `For more information, see ${WARNING_PROGRESS_WITHOUT_PATCH_SIZE_URL}.`,
    ].join(' ');
    const ERROR_INVALID_TENSOR_PREDICTED_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-predicted-tensor';
    const ERROR_INVALID_TENSOR_PREDICTED = (shape) => [
        `The tensor returned by the model was not a valid rank-4 tensor. It's shape is ${JSON.stringify(shape)}.}`,
        'UpscalerJS only supports models returning valid image-like data in four dimensional form.',
        `For more information, see ${ERROR_INVALID_TENSOR_PREDICTED_URL}.`,
    ].join(' ');
    const ERROR_INVALID_MODEL_PREDICTION_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-model-prediction';
    const ERROR_INVALID_MODEL_PREDICTION = [
        'The model output was not a valid tensor. UpscalerJS only supports models returning valid tensors.',
        'This is likely an error with the model itself, not UpscalerJS.',
        `For more information, see ${ERROR_INVALID_MODEL_PREDICTION_URL}.`,
    ].join(' ');
    const GET_UNDEFINED_TENSORS_ERROR = new Error('No defined tensors were passed to concatTensors');
    class AbortError extends Error {
        message = 'The upscale request received an abort signal';
    }
    const ERROR_INVALID_MODEL_TYPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-model-type';
    const WARNING_INPUT_SIZE_AND_PATCH_SIZE_URL = 'https://upscalerjs.com/documentation/troubleshooting#input-size-and-patch-size';
    const ERROR_WITH_MODEL_INPUT_SHAPE_URL = 'https://upscalerjs.com/documentation/troubleshooting#error-with-model-input-shape';
    const ERROR_UNDEFINED_MODEL = new Error('An undefined model was provided to UpscalerJS');
    const ERROR_INVALID_MODEL_TYPE = (modelType) => ([
        `You've provided an invalid model type: ${JSON.stringify(modelType)}. Accepted types are "layers" and "graph".`,
        `For more information, see ${ERROR_INVALID_MODEL_TYPE_URL}.`,
    ].join(' '));
    const ERROR_MODEL_DEFINITION_BUG = (err) => new Error(`There is a bug with the upscaler code. Please report this. ${err ? `Error: ${err}` : ''}`.trim());
    const WARNING_INPUT_SIZE_AND_PATCH_SIZE = [
        'You have provided a patchSize, but the model definition already includes an input size.',
        'Your patchSize will be ignored.',
        `For more information, see ${WARNING_INPUT_SIZE_AND_PATCH_SIZE_URL}.`,
    ].join(' ');
    const ERROR_WITH_MODEL_INPUT_SHAPE = (inputShape) => [
        `Expected model to have a rank-4 compatible input shape. Instead got: ${JSON.stringify(inputShape)}.`,
        `For more information, see ${ERROR_WITH_MODEL_INPUT_SHAPE_URL}.`,
    ].join(' ');
    const GET_INVALID_PATCH_SIZE = (patchSize) => new Error([
        `Invalid patch size: ${patchSize}. Patch size must be greater than 0.`,
    ].join(' '));
    const GET_INVALID_PATCH_SIZE_AND_PADDING = (patchSize, padding) => new Error([
        `Invalid patch size and padding: ${patchSize} and ${padding}. Patch size must be greater than padding * 2.`,
    ].join(' '));
    const WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR_URL = 'https://upscalerjs.com/documentation/troubleshooting#patch-size-indivisible-by-divisibility-factor';
    const GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR = (patchSize, divisibilityFactor, upscaledPatchSize) => [
        `Invalid patch size: ${patchSize}. The model has a defined divibility factor of ${divisibilityFactor} and patch size must be a multiple of this number.`,
        `Patch size has been scaled up to ${upscaledPatchSize}.`,
        `\nFor more information, see ${WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR_URL}.`,
    ].join(' ');
    const MODEL_INPUT_SIZE_MUST_BE_SQUARE = new Error([
        'Model input sizes must be square. If you are using a model with a non-square input size and would like to request support,',
        'please file a feature request at https://github.com/thekevinscott/upscalerjs',
    ].join(' '));
    const MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS_URL = 'https://upscalerjs.com/documentation/troubleshooting#missing-path-and-internals';
    const GET_MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS = (modelConfiguration) => [
        'Provided model configuration is missing both a "path" and "_internals". A valid path to a model JSON file must be provided.',
        `For more information, see ${MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS_URL}.`,
        `The model configuration provided was: ${JSON.stringify(modelConfiguration)}`,
    ].join(' ');

    const isShape4D = (shape) => {
        if (!Boolean(shape) || !Array.isArray(shape) || shape.length !== 4) {
            return false;
        }
        return shape.every((value) => value === null || typeof value === 'number');
    };
    const isFixedShape4D = (shape) => isShape4D(shape) && shape[1] !== null && shape[2] !== null && shape[1] > 0 && shape[2] > 0;
    function makeIsNDimensionalTensor(rank) {
        function fn(pixels) {
            try {
                return pixels.shape.length === rank;
            }
            catch (err) {
            }
            return false;
        }
        return fn;
    }
    const isFourDimensionalTensor = makeIsNDimensionalTensor(4);
    const isThreeDimensionalTensor = makeIsNDimensionalTensor(3);
    const isTensor = (input) => input instanceof tf__namespace.Tensor;
    const isString = (el) => typeof el === 'string';
    const isValidModelType = (modelType) => typeof modelType === 'string' && ['layers', 'graph',].includes(modelType);
    const isNumber = (el) => typeof el === 'number';
    const isValidRange = (range) => Array.isArray(range) && range.length === 2 && range.every(isNumber);

    const warn = (msg) => {
        console.warn(Array.isArray(msg) ? msg.join('\n') : msg);
    };
    function isProgress(p) { return p !== undefined && typeof p === 'function'; }
    function isSingleArgProgress(p) { return isProgress(p) && p.length <= 1; }
    const isMultiArgTensorProgress = (p, output, progressOutput) => {
        if (!isProgress(p) || p.length <= 1) {
            return false;
        }
        if (progressOutput === undefined && output === 'tensor') {
            return true;
        }
        return progressOutput === 'tensor';
    };
    const isAborted = (abortSignal) => {
        if (abortSignal) {
            return abortSignal.aborted;
        }
        return false;
    };
    async function wrapGenerator(gen, postNext) {
        let result;
        for (result = await gen.next(); !result.done; result = await gen.next()) {
            if (postNext) {
                await postNext(result.value);
            }
        }
        return result.value;
    }
    function nonNullable(value) {
        return value !== null && value !== undefined;
    }
    function processAndDisposeOfTensor(tf, tensor, ..._processFns) {
        const processFns = _processFns.filter(nonNullable);
        if (processFns.length) {
            const processedTensor = tf.tidy(() => processFns.reduce((reducedTensor, processFn) => processFn(reducedTensor), tensor));
            if (!tensor.isDisposed && tensor !== processedTensor) {
                tensor.dispose();
            }
            return processedTensor;
        }
        return tensor;
    }
    const checkModelDefinition = (modelDefinition) => {
        if (modelDefinition === undefined) {
            throw ERROR_UNDEFINED_MODEL;
        }
        if (!isValidModelType(modelDefinition.modelType ?? 'layers')) {
            throw ERROR_INVALID_MODEL_TYPE(modelDefinition);
        }
        if (!modelDefinition.path && !modelDefinition._internals?.path) {
            throw GET_MODEL_CONFIGURATION_MISSING_PATH_AND_INTERNALS(modelDefinition);
        }
    };

    const makeTick = (tf, signal, awaitNextFrame) => async (result) => {
        if (awaitNextFrame) {
            await tf.nextFrame();
        }
        if (isAborted(signal)) {
            if (Array.isArray(result)) {
                result.forEach(r => r?.dispose());
            }
            else if (isTensor(result)) {
                result.dispose();
            }
            throw new AbortError();
        }
    };

    const isWarmupSizeByPatchSize = (size) => {
        if (!size || typeof size !== 'object') {
            return false;
        }
        return 'patchSize' in size && typeof size.patchSize === 'number';
    };
    const isNumericWarmupSize = (size) => {
        return Boolean(size) && typeof size === 'number' && size > 0;
    };
    const ERROR_INVALID_WARMUP_VALUE_URL = 'https://upscalerjs.com/documentation/troubleshooting#invalid-warmup-value';
    const ERROR_INVALID_WARMUP_VALUE = (size) => ([
        'Invalid value passed to warmup in warmupSizes:',
        JSON.stringify(size),
        `For more information, see ${ERROR_INVALID_WARMUP_VALUE_URL}.`,
    ].join('\n'));
    const getInvalidValueError = (size) => new Error(ERROR_INVALID_WARMUP_VALUE(size));
    const getWidthAndHeight = (size) => {
        if (isWarmupSizeByPatchSize(size)) {
            const { patchSize, } = size;
            return patchSize;
        }
        return size;
    };
    async function* warmup(tf, modelPackage, sizes) {
        const { model, modelDefinition, } = await modelPackage;
        for (const size of sizes) {
            if (!isWarmupSizeByPatchSize(size) && !isNumericWarmupSize(size)) {
                throw getInvalidValueError(size);
            }
            const warmupSize = getWidthAndHeight(size);
            let dummyTensor = tf.zeros([1, warmupSize, warmupSize, 3,]);
            yield [dummyTensor,];
            const fns = [
                modelDefinition.preprocess,
                (t) => model.predict(t),
                modelDefinition.postprocess,
            ].filter(Boolean);
            for (const fn of fns) {
                dummyTensor = processAndDisposeOfTensor(tf, dummyTensor, fn);
                yield [dummyTensor,];
            }
            dummyTensor.dispose();
            yield;
        }
    }
    const getSizesAsArray = (sizes) => {
        if (Array.isArray(sizes)) {
            for (const size of sizes) {
                if (!isWarmupSizeByPatchSize(size) && !isNumericWarmupSize(size)) {
                    throw getInvalidValueError(sizes);
                }
            }
            return sizes;
        }
        else if (isWarmupSizeByPatchSize(sizes) || isNumericWarmupSize(sizes)) {
            return [sizes,];
        }
        throw getInvalidValueError(sizes);
    };
    const cancellableWarmup = async (tf, modelPackage, sizes, { signal = undefined, awaitNextFrame = false, } = {}, internalArgs) => {
        const tick = makeTick(tf, signal || internalArgs.signal, awaitNextFrame);
        await tick();
        await wrapGenerator(warmup(tf, modelPackage, getSizesAsArray(sizes)), tick);
    };

    const isLayersModel = (tf, model) => model instanceof tf.LayersModel;

    const parseModelDefinition = (modelDefinition) => ({
        ...modelDefinition,
    });
    function isModelDefinitionFn(modelDefinition) { return typeof modelDefinition === 'function'; }
    function getModelDefinitionOrModelDefinitionFnAsModelDefinition(tf, modelDefinition) {
        if (isModelDefinitionFn(modelDefinition)) {
            warn(WARNING_DEPRECATED_MODEL_DEFINITION_FN);
            return modelDefinition(tf);
        }
        return modelDefinition;
    }
    async function getModel(tf, modelDefinition) {
        const modelDef = getModelDefinitionOrModelDefinitionFnAsModelDefinition(tf, modelDefinition);
        if (modelDef.setup) {
            await modelDef.setup(tf);
        }
        return modelDef;
    }
    function loadTfModel(tf, modelPath, modelType) {
        if (modelType === 'graph') {
            return tf.loadGraphModel(modelPath);
        }
        return tf.loadLayersModel(modelPath);
    }
    const getBatchInputShape = (tf, model) => {
        if (isLayersModel(tf, model)) {
            return model.layers[0].batchInputShape;
        }
        return model.inputs[0].shape;
    };
    const getModelInputShape = (tf, { model, }) => {
        const batchInputShape = getBatchInputShape(tf, model);
        if (!isShape4D(batchInputShape)) {
            throw new Error(ERROR_WITH_MODEL_INPUT_SHAPE(batchInputShape));
        }
        return batchInputShape;
    };
    const getPatchSizeAsMultiple = (divisibilityFactor, patchSize) => {
        return Math.ceil(patchSize / divisibilityFactor) * divisibilityFactor;
    };
    const parsePatchAndInputShapes = (tf, modelPackage, { patchSize, padding, }, imageSize) => {
        const modelInputShape = getModelInputShape(tf, modelPackage);
        if (patchSize !== undefined) {
            if (patchSize <= 0) {
                throw GET_INVALID_PATCH_SIZE(patchSize);
            }
            if (padding !== undefined && padding * 2 >= patchSize) {
                throw GET_INVALID_PATCH_SIZE_AND_PADDING(patchSize, padding);
            }
        }
        if (isFixedShape4D(modelInputShape)) {
            if (patchSize !== undefined) {
                warn(WARNING_INPUT_SIZE_AND_PATCH_SIZE);
            }
            if (modelInputShape[1] !== modelInputShape[2]) {
                throw MODEL_INPUT_SIZE_MUST_BE_SQUARE;
            }
            return {
                patchSize: modelInputShape[1],
                padding,
                modelInputShape,
            };
        }
        if (patchSize !== undefined && padding === undefined) {
            warn(WARNING_UNDEFINED_PADDING);
        }
        const { divisibilityFactor, } = modelPackage.modelDefinition;
        if (divisibilityFactor !== undefined) {
            if (patchSize !== undefined) {
                const multipliedPatchSize = getPatchSizeAsMultiple(divisibilityFactor, patchSize);
                if (multipliedPatchSize !== patchSize) {
                    warn(GET_WARNING_PATCH_SIZE_INDIVISIBLE_BY_DIVISIBILITY_FACTOR(patchSize, divisibilityFactor, multipliedPatchSize));
                }
                return {
                    patchSize: multipliedPatchSize,
                    padding,
                    modelInputShape: [null, multipliedPatchSize, multipliedPatchSize, 3,],
                };
            }
            return {
                patchSize: undefined,
                padding: undefined,
                modelInputShape: [
                    null,
                    getPatchSizeAsMultiple(divisibilityFactor, imageSize[1]),
                    getPatchSizeAsMultiple(divisibilityFactor, imageSize[2]),
                    3,
                ],
            };
        }
        return {
            patchSize,
            padding,
            modelInputShape: undefined,
        };
    };

    const padInput = (tf, inputShape) => (pixels) => {
        const pixelsHeight = pixels.shape[1];
        const pixelsWidth = pixels.shape[2];
        if (isFixedShape4D(inputShape) && (inputShape[1] > pixelsHeight || inputShape[2] > pixelsWidth)) {
            return tf.tidy(() => {
                const height = Math.max(pixelsHeight, inputShape[1]);
                const width = Math.max(pixelsWidth, inputShape[2]);
                const rightTensor = tf.zeros([1, pixelsHeight, width - pixelsWidth, 3,]);
                const bottomTensor = tf.zeros([1, height - pixelsHeight, width, 3,]);
                const topTensor = tf.concat([pixels, rightTensor,], 2);
                const final = tf.concat([topTensor, bottomTensor,], 1);
                return final;
            });
        }
        return pixels;
    };
    const trimInput = (tf, imageSize, scale) => (pixels) => {
        const height = imageSize[1] * scale;
        const width = imageSize[2] * scale;
        if (height < pixels.shape[1] || width < pixels.shape[2]) {
            return tf.tidy(() => tf.slice(pixels, [0, 0, 0,], [1, height, width, 3,]));
        }
        return pixels;
    };
    const scaleOutput = (range) => (pixels) => {
        const endingRange = isValidRange(range) ? range[1] : 255;
        return pixels.clipByValue(0, endingRange).mul(endingRange === 1 ? 255 : 1);
    };
    const scaleIncomingPixels = (tf, range) => (tensor) => {
        if (isValidRange(range) && range[1] === 1) {
            return tf.mul(tensor, 1 / 255);
        }
        return tensor;
    };
    const tensorAsClampedArray = (tf, tensor) => tf.tidy(() => {
        const [height, width,] = tensor.shape;
        const fill = tf.fill([height, width,], 255).expandDims(2);
        return tensor.clipByValue(0, 255).concat([fill,], 2).dataSync();
    });
    function getCopyOfInput(input) { return (isTensor(input) ? input.clone() : input); }
    function concatTensors(tf, tensors, axis = 0) {
        const definedTensors = tensors.filter(nonNullable);
        if (definedTensors.length === 0) {
            throw GET_UNDEFINED_TENSORS_ERROR;
        }
        const concatenatedTensor = tf.concat(definedTensors, axis);
        tensors.forEach(tensor => tensor?.dispose());
        return concatenatedTensor;
    }

    const get1DPatch = (total, idx, patchSize, padding) => {
        let preOrigin = idx;
        const prePadding = idx === 0 ? 0 : patchSize === total ? 0 : padding;
        const isBeyondBounds = preOrigin + patchSize > total;
        let postOrigin = isBeyondBounds ? patchSize - (total - preOrigin) : 0;
        const postPadding = isBeyondBounds ? 0 : patchSize === total ? 0 : padding;
        const prePaddingAdjusted = isBeyondBounds ? 0 : prePadding;
        let postSize = patchSize - (isBeyondBounds ? postOrigin : 0);
        if (isBeyondBounds) {
            preOrigin = total - patchSize;
        }
        preOrigin -= prePaddingAdjusted;
        postOrigin += prePaddingAdjusted;
        postSize -= prePaddingAdjusted + postPadding;
        const increment = patchSize > total ? total : patchSize - prePadding - postPadding;
        return {
            pre: {
                origin: preOrigin,
                size: patchSize,
            },
            post: {
                origin: postOrigin,
                size: postSize,
            },
            increment,
        };
    };
    const getPatchesFromImage = ([width, height,], patchSize, padding) => {
        const patches = [];
        let x = 0;
        let y = 0;
        while (y < height) {
            const { pre: { origin: preOriginY, size: preSizeY, }, post: { origin: postOriginY, size: postSizeY, }, increment: yIncrement, } = get1DPatch(height, y, Math.min(patchSize, height), padding);
            const row = [];
            while (x < width) {
                const { pre: { origin: preOriginX, size: preSizeX, }, post: { origin: postOriginX, size: postSizeX, }, increment: xIncrement, } = get1DPatch(width, x, Math.min(patchSize, width), padding);
                row.push({
                    pre: {
                        origin: [preOriginY, preOriginX,],
                        size: [preSizeY, preSizeX,],
                    },
                    post: {
                        origin: [postOriginY, postOriginX,],
                        size: [postSizeY, postSizeX,],
                    },
                });
                x += xIncrement;
            }
            patches.push(row);
            x = 0;
            y += yIncrement;
        }
        return patches;
    };

    const getPercentageComplete = (row, col, columns, total) => {
        const index = row * columns + col + 1;
        const percent = index / total;
        return percent;
    };
    const executeModel = (model, pixels) => {
        const predictedPixels = model.predict(pixels);
        if (!isTensor(predictedPixels)) {
            throw new Error(ERROR_INVALID_MODEL_PREDICTION);
        }
        if (isFourDimensionalTensor(predictedPixels)) {
            return predictedPixels;
        }
        throw new Error(ERROR_INVALID_TENSOR_PREDICTED(predictedPixels.shape));
    };
    async function* processPixels(tf, pixels, { output, progress, progressOutput, }, modelPackage, { originalImageSize, patchSize, padding = 0, }, { tensorAsBase64, }) {
        const { model, modelDefinition, } = modelPackage;
        const scale = modelDefinition.scale ?? 1;
        if (patchSize) {
            const [height, width,] = pixels.shape.slice(1);
            const patches = getPatchesFromImage([width, height,], patchSize, padding);
            yield;
            let upscaledTensor;
            const total = patches.length * patches[0].length;
            for (let rowIdx = 0; rowIdx < patches.length; rowIdx++) {
                const row = patches[rowIdx];
                const columns = row.length;
                let colTensor;
                yield [colTensor, upscaledTensor,];
                for (let colIdx = 0; colIdx < columns; colIdx++) {
                    const { pre, post, } = row[colIdx];
                    yield [upscaledTensor, colTensor,];
                    const slicedPixels = pixels.slice([0, ...pre.origin,], [-1, ...pre.size,]);
                    yield [upscaledTensor, colTensor, slicedPixels,];
                    const prediction = executeModel(model, slicedPixels);
                    slicedPixels.dispose();
                    yield [upscaledTensor, colTensor, prediction,];
                    const startSlice = [0, post.origin[0] * scale, post.origin[1] * scale,];
                    const endSlice = [-1, post.size[0] * scale, post.size[1] * scale,];
                    const slicedPrediction = prediction.slice(startSlice, endSlice);
                    prediction.dispose();
                    yield [upscaledTensor, colTensor, slicedPrediction,];
                    const processedPrediction = processAndDisposeOfTensor(tf, slicedPrediction, modelDefinition.postprocess, scaleOutput(modelDefinition.outputRange));
                    yield [upscaledTensor, colTensor, processedPrediction,];
                    if (progress !== undefined && isProgress(progress)) {
                        const percent = getPercentageComplete(rowIdx, colIdx, columns, total);
                        if (isSingleArgProgress(progress)) {
                            progress(percent);
                        }
                        else {
                            const squeezedTensor = processedPrediction.squeeze();
                            const sliceData = {
                                row: rowIdx,
                                col: colIdx,
                                patchCoordinates: {
                                    pre,
                                    post,
                                },
                            };
                            if (isMultiArgTensorProgress(progress, output, progressOutput)) {
                                progress(percent, squeezedTensor, sliceData);
                            }
                            else {
                                const src = tensorAsBase64(tf, squeezedTensor);
                                squeezedTensor.dispose();
                                progress(percent, src, sliceData);
                            }
                        }
                    }
                    yield [upscaledTensor, colTensor, processedPrediction,];
                    colTensor = concatTensors(tf, [colTensor, processedPrediction,], 2);
                    processedPrediction.dispose();
                    yield [upscaledTensor, colTensor,];
                }
                upscaledTensor = concatTensors(tf, [upscaledTensor, colTensor,], 1);
                colTensor.dispose();
                yield [upscaledTensor,];
            }
            const processedUpscaledTensor = processAndDisposeOfTensor(tf, upscaledTensor.clone(), trimInput(tf, originalImageSize, scale));
            upscaledTensor?.dispose();
            yield [processedUpscaledTensor,];
            const squeezedTensor = processedUpscaledTensor.squeeze();
            processedUpscaledTensor.dispose();
            return squeezedTensor;
        }
        if (progress) {
            warn(WARNING_PROGRESS_WITHOUT_PATCH_SIZE);
        }
        const prediction = executeModel(model, pixels);
        yield [prediction,];
        const postprocessedTensor = processAndDisposeOfTensor(tf, prediction.clone(), modelDefinition.postprocess, scaleOutput(modelDefinition.outputRange), trimInput(tf, originalImageSize, scale));
        prediction.dispose();
        yield [postprocessedTensor,];
        const squeezedTensor = postprocessedTensor.squeeze();
        postprocessedTensor.dispose();
        return squeezedTensor;
    }
    async function* upscale(tf, input, args, modelPackage, { getImageAsTensor, tensorAsBase64, }) {
        const parsedInput = getCopyOfInput(input);
        const startingPixels = await getImageAsTensor(tf, parsedInput);
        yield startingPixels;
        const imageSize = startingPixels.shape;
        const { patchSize, padding, modelInputShape, } = parsePatchAndInputShapes(tf, modelPackage, args, imageSize);
        const preprocessedPixels = processAndDisposeOfTensor(tf, startingPixels, modelPackage.modelDefinition.preprocess, scaleIncomingPixels(tf, modelPackage.modelDefinition.inputRange), modelInputShape ? padInput(tf, modelInputShape) : undefined);
        yield preprocessedPixels;
        const gen = processPixels(tf, preprocessedPixels, {
            output: args.output,
            progressOutput: args.progressOutput,
            progress: args.progress,
        }, modelPackage, {
            originalImageSize: imageSize,
            patchSize,
            padding,
        }, {
            tensorAsBase64,
        });
        let result = await gen.next();
        yield result.value;
        while (!result.done) {
            result = await gen.next();
            if (Array.isArray(result.value)) {
                yield [...result.value, preprocessedPixels,];
            }
            else if (isTensor(result.value)) {
                yield [result.value, preprocessedPixels,];
            }
            else {
                yield preprocessedPixels;
            }
        }
        preprocessedPixels.dispose();
        const upscaledPixels = result.value;
        if (args.output === 'tensor') {
            return upscaledPixels;
        }
        const base64Src = tensorAsBase64(tf, upscaledPixels);
        upscaledPixels.dispose();
        return base64Src;
    }
    async function cancellableUpscale(tf, input, { signal, awaitNextFrame, ...args }, internalArgs, { checkValidEnvironment, ...internalConfig }) {
        checkValidEnvironment(input, {
            output: args.output,
            progressOutput: args.progressOutput,
        });
        const tick = makeTick(tf, signal || internalArgs.signal, awaitNextFrame);
        await tick();
        const upscaledPixels = await wrapGenerator(upscale(tf, input, args, internalArgs, internalConfig), tick);
        await tick();
        return upscaledPixels;
    }

    const DEFAULT_MODEL = DefaultUpscalerModel;
    function getUpscaler({ tf, getUpscaleOptions, checkValidEnvironment, getImageAsTensor, tensorAsBase64, loadModel, }) {
        class Upscaler {
            _opts;
            _model;
            ready;
            _abortController = new AbortController();
            constructor(opts = {}) {
                this._opts = {
                    ...opts,
                };
                this._model = loadModel(tf, getModel(tf, this._opts.model || DEFAULT_MODEL));
                this.ready = new Promise((resolve, reject) => {
                    this._model.then(() => cancellableWarmup(tf, this._model, (this._opts.warmupSizes || []), undefined, {
                        signal: this._abortController.signal,
                    })).then(resolve).catch(reject);
                });
            }
            async execute(image, options) {
                const internals = {
                    checkValidEnvironment,
                    getImageAsTensor,
                    tensorAsBase64,
                };
                await this.ready;
                const modelPackage = await this._model;
                return cancellableUpscale(tf, image, getUpscaleOptions(options), {
                    ...modelPackage,
                    signal: this._abortController.signal,
                }, internals);
            }
            upscale = this.execute.bind(this);
            warmup = async (warmupSizes = [], options) => {
                await this.ready;
                return cancellableWarmup(tf, this._model, warmupSizes, options, {
                    signal: this._abortController.signal,
                });
            };
            abort = () => {
                this._abortController.abort();
                this._abortController = new AbortController();
            };
            dispose = async () => {
                await this.ready;
                const { model, modelDefinition, } = await this._model;
                if (modelDefinition.teardown) {
                    await modelDefinition.teardown(tf);
                }
                model.dispose();
            };
            getModel = () => this._model;
        }
        return Upscaler;
    }

    const getOutputOption = (output) => {
        if (output === 'tensor') {
            return 'tensor';
        }
        return 'base64';
    };
    const getUpscaleOptions = ({ output, progressOutput, ...options } = {}) => {
        return {
            ...options,
            output: getOutputOption(output),
            progressOutput: getOutputOption(progressOutput || output),
        };
    };

    const CDN_PATH_DEFINITIONS = {
        'jsdelivr': (packageName, version, path) => `https://cdn.jsdelivr.net/npm/${packageName}@${version}/${path}`,
        'unpkg': (packageName, version, path) => `https://unpkg.com/${packageName}@${version}/${path}`,
    };
    const CDNS = [
        'jsdelivr',
        'unpkg',
    ];
    const getLoadModelErrorMessage = (errs, modelPath, internals) => new Error([
        `Could not resolve URL ${modelPath} for package ${internals?.name}@${internals?.version}`,
        'Errors include:',
        ...errs.map(([cdn, err,]) => `- ${cdn}: ${err.message}`),
    ].join('\n'));
    async function fetchModel(tf, modelConfiguration) {
        const { modelType, _internals, path: modelPath, } = modelConfiguration;
        if (modelPath) {
            return await loadTfModel(tf, modelPath, modelType);
        }
        if (!_internals) {
            throw ERROR_MODEL_DEFINITION_BUG('Missing internals');
        }
        const errs = [];
        for (const cdn of CDNS) {
            const getCDNFn = CDN_PATH_DEFINITIONS[cdn];
            try {
                const url = getCDNFn(_internals.name, _internals.version, _internals.path);
                return await loadTfModel(tf, url, modelType);
            }
            catch (err) {
                errs.push([cdn, err instanceof Error ? err : new Error(`There was an unknown error: ${JSON.stringify(err)}`),]);
            }
        }
        throw getLoadModelErrorMessage(errs, modelPath || _internals.path, _internals);
    }
    const loadModel = async (tf, _modelDefinition) => {
        const modelDefinition = await _modelDefinition;
        checkModelDefinition(modelDefinition);
        const parsedModelDefinition = parseModelDefinition(modelDefinition);
        const model = await fetchModel(tf, parsedModelDefinition);
        return {
            model,
            modelDefinition: parsedModelDefinition,
        };
    };

    const ERROR_ENVIRONMENT_DISALLOWS_BASE64_URL = 'https://upscalerjs.com/documentation/troubleshooting#environment-disallows-base64';
    const ERROR_ENVIRONMENT_DISALLOWS_STRING_INPUT_URL = 'https://upscalerjs.com/documentation/troubleshooting#environment-disallows-string-input';
    const getEnvironmentDisallowsStringInput = () => new Error([
        'Environment does not support a string URL as an input format.',
        `For more information, see ${ERROR_ENVIRONMENT_DISALLOWS_STRING_INPUT_URL}.`,
    ].join('\n'));
    const getEnvironmentDisallowsBase64 = () => new Error([
        'Environment does not support base64 as an output format.',
        `For more information, see ${ERROR_ENVIRONMENT_DISALLOWS_BASE64_URL}.`,
    ].join('\n'));
    const getInvalidTensorError = (input) => new Error([
        `Unsupported dimensions for incoming pixels: ${input.shape.length}.`,
        'Only 3 or 4 rank tensors are supported.',
    ].join('\n'));
    const getInvalidImageError = () => new Error([
        'Failed to load image',
    ].join(' '));
    const loadImage = (src) => new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(getInvalidImageError());
    });
    const fromPixels = (input) => tf__namespace$1.browser.fromPixelsAsync(input);
    const getTensorFromInput = async (input, _tf) => {
        if (isTensor(input)) {
            return input;
        }
        if (isString(input)) {
            const imgHTMLElement = await loadImage(input);
            return fromPixels(imgHTMLElement);
        }
        return fromPixels(input);
    };
    const getImageAsTensor = async (tf, input) => {
        const tensor = await getTensorFromInput(input);
        if (isThreeDimensionalTensor(tensor)) {
            const expandedTensor = tensor.expandDims(0);
            tensor.dispose();
            return expandedTensor;
        }
        if (isFourDimensionalTensor(tensor)) {
            return tensor;
        }
        throw getInvalidTensorError(tensor);
    };
    const tensorAsBase64 = (tf, tensor) => {
        const arr = tensorAsClampedArray(tf, tensor);
        const [height, width,] = tensor.shape;
        const imageData = new ImageData(width, height);
        imageData.data.set(arr);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            throw new Error('No context found');
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas.toDataURL();
    };
    const checkIfValidEnvironment = (errFn) => {
        try {
            if ((new Image() && 'createElement' in document) !== true) {
                throw errFn();
            }
        }
        catch (err) {
            throw errFn();
        }
    };
    const checkValidEnvironment = (input, { output = 'base64', progressOutput, }) => {
        if (typeof input === 'string') {
            checkIfValidEnvironment(getEnvironmentDisallowsStringInput);
        }
        if (progressOutput === 'base64' || output === 'base64') {
            checkIfValidEnvironment(getEnvironmentDisallowsBase64);
        }
    };

    var Upscaler = getUpscaler({
        tf: tf__namespace$1,
        getUpscaleOptions,
        loadModel,
        getImageAsTensor,
        tensorAsBase64,
        checkValidEnvironment,
    });

    Upscaler.getPatchesFromImage = getPatchesFromImage;
    Upscaler.AbortError = AbortError;

    return Upscaler;

}));
