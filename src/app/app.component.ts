import { Component } from '@angular/core';
import { vdCanvasOptions } from './modules/vd-canvas/vd-canvas.component';
import { vdCanvasService } from './modules/vd-canvas/vd-canvas.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  viewProviders: [vdCanvasService]
})
export class AppComponent {
  title = 'app';
  diagram:any;

  canvasOptions: vdCanvasOptions = {
    drawButtonEnabled: true,
    drawButtonClass: "drawButtonClass",
    drawButtonText: "Draw",
    clearButtonEnabled: true,
    clearButtonClass: "clearButtonClass",
    clearButtonText: "Clear",
    undoButtonText: "Undo",
    undoButtonEnabled: true,
    redoButtonText: "Redo",
    redoButtonEnabled: true,
    colorPickerEnabled: true,
    saveDataButtonEnabled: false,
    saveDataButtonText: "Save",
    strokeColor: "rgb(0,0,0)",
    shouldDownloadDrawing: false,
    canvasCurser:'auto'
  };

  onCanvasSave(evt:string | Blob){
    // You may track canvas changes over here

    // console.log(`your drawing`)
    // console.log(evt.toString());
  }

  getDrawing(){
    // updated drawing in diagram
    console.log(`get final drawing`)
    console.log(this.diagram);
  }
  
}
