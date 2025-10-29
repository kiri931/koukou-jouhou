1. **Xcodeの起動**
   - アプリケーションフォルダからXcodeを起動します。

2. **新しいプロジェクトの作成**
   - Xcodeが起動したら、「Create a new Xcode project」を選択します。
   - テンプレートの選択画面で「App」を選択し、「Next」をクリックします。
   - プロジェクト名を入力し、必要に応じて他の設定を行い、「Next」をクリックします。
   - プロジェクトの保存場所を選択し、「Create」をクリックします。

3. **HelloWorldのコードを記述**
   - プロジェクトが作成されたら、`ContentView.swift`ファイルを開きます。
   - 以下のコードを追加します。

   ```swift
   import SwiftUI

   struct ContentView: View {
       var body: some View {
           Text("Hello, World!")
               .padding()
               .font(.largeTitle)
               .foregroundColor(.blue)
       }
   }

   struct ContentView_Previews: PreviewProvider {
       static var previews: some View {
           ContentView()
       }
   }
   ```

4. **シミュレータで実行**
   - Xcodeの上部にある再生ボタン（Runボタン）をクリックして、シミュレータでアプリを実行します。
   - シミュレータが起動し、「Hello, World!」と表示されることを確認します。