// Copyright (c) 2018 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/* global fetch */

import {CompositeLayer} from '@deck.gl/core';
import DeckGLTileLayer from '@deck.gl/experimental-layers/dist/tile-layer/tile-layer';
import Pbf from "pbf";
import * as geobuf from "geobuf";
import dataProcessor from 'processors';
 
export default class SharedstreetsLayer extends CompositeLayer {
  initializeState() {
    this.setState({
      isTiledSampleDataLoaded: false,
      sampleDataSize: 0
    })
  }

  getTileData({ x, y, z }) {
    const fetchConfig = {
      method: "GET",
      mode: "cors",
      cache: "no-cache"
    };
    return fetch(
      `http://d2sn2dqnporv7a.cloudfront.net/${z}-${x}-${y}-decoded`,
      fetchConfig
    )
    .then(response => {
      return response.arrayBuffer();
    })
    .then(buffer => {
      const geoJson = geobuf.decode(new Pbf(buffer));
      const geoJsonLength = geoJson.features.length;
      if (!this.state.isTiledSampleDataLoaded) {
        this.props.addTiledDatasetSample('sharedstreets', dataProcessor.processGeojson(geoJson));
        this.setState({
          isTiledSampleDataLoaded: true,
          sampleDataSize: geoJsonLength
        });
      } else {
        for (let i = 0; i < geoJsonLength; i++) {
          // HACK: make sure the data is the same as KeplerGL layer data.
          geoJson.features[i].properties.index = i % this.state.sampleDataSize;
        }
      }
      return geoJson;
    });
  }
  
  renderSubLayers(subLayerProps) {
    return this.props.tiledSampleLayers && this.props.tiledSampleLayers.map(layer => {
      return layer && new layer.constructor({
        ...layer.props,
        ...subLayerProps,
        id: `${subLayerProps.id}-${layer.id}`
      });
    })
  }

  renderLayers() {
    return [
      new DeckGLTileLayer({
        getTileData: this.getTileData.bind(this),
        maxZoom: 12,
        minZoom: 12,
        renderSubLayers: this.renderSubLayers.bind(this)
      })
    ];
  }
}