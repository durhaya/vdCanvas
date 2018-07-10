import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {FormsModule } from '@angular/forms';
import { VdCanvasComponent } from './vd-canvas.component';
import { vdCanvasColorPickerComponent } from './vd-canvas-color-picker.component';
import { vdCanvasTextToolbarComponent } from './vd-canvas-text-toolbar.component';
import { vdCanvasBrushToolbarComponent } from './vd-canvas-brush-toolbar.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule
  ],
  declarations: [
    VdCanvasComponent,
    vdCanvasColorPickerComponent,
    vdCanvasTextToolbarComponent,
    vdCanvasBrushToolbarComponent,
  ],
  exports:[
      VdCanvasComponent,
      vdCanvasColorPickerComponent,
      vdCanvasTextToolbarComponent,
      vdCanvasBrushToolbarComponent,
  ]
})
export class VdCanvasModule { }
